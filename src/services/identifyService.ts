import db from '../db';

// Type definition for a contact row in the database
type Contact = {
    id: number;
    phoneNumber: string | null;
    email: string | null;
    linkedId: number | null;
    linkPrecedence: "primary" | "secondary";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export function identifyContactService(email?: string, phoneNumber?: string) {
    // Find all contacts matching the given email or phone number
    const matchedContacts = db.prepare(
        `SELECT * FROM contacts WHERE (email = @email AND email IS NOT NULL) OR (phoneNumber = @phoneNumber AND phoneNumber IS NOT NULL)`
    ).all({ email, phoneNumber }) as Contact[];

    // Helper function to get all contacts linked to a primary (including the primary itself)
    function getAllLinkedContacts(primaryId: number): Contact[] {
        return db.prepare(
            `SELECT * FROM contacts WHERE id = @id OR linkedId = @id`
        ).all({ id: primaryId }) as Contact[];
    }

    // If no matches, create a new primary contact and return the response
    if (matchedContacts.length === 0) {
        const now = new Date().toISOString();
        const result = db.prepare(
            `INSERT INTO contacts (email, phoneNumber, linkPrecedence, createdAt, updatedAt) VALUES (@email, @phoneNumber, 'primary', @now, @now)`
        ).run({ email, phoneNumber, now });
        return {
            primaryContactId: result.lastInsertRowid,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber] : [],
            secondaryContactIds: []
        };
    }

    // Collect all unique contacts (could be multiple primaries)
    let allContacts: Contact[] = [];
    let primaryIds = new Set<number>();
    for (const contact of matchedContacts) {
        // For each match, get the primary id (either itself or its linkedId)
        const primaryId = contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!;
        primaryIds.add(primaryId);
    }

    // Gather all contacts linked to each primary
    for (const pid of primaryIds) {
        allContacts.push(...getAllLinkedContacts(pid));
    }

    // Remove duplicate contacts by id
    allContacts = Array.from(new Map(allContacts.map(c => [c.id, c])).values());

    // If more than one primary, merge them
    if (primaryIds.size > 1) {
        // Find all primaries and sort by creation date (oldest first)
        const primaries = allContacts.filter(c => c.linkPrecedence === 'primary');
        primaries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const mainPrimary = primaries[0]; // Oldest becomes the main primary
        const toSecondary = primaries.slice(1); // Others become secondary

        for (const sec of toSecondary) {
            // Convert secondary primaries to secondary and link to main primary
            db.prepare(
                `UPDATE contacts SET linkPrecedence = 'secondary', linkedId = @mainId WHERE id = @id`
            ).run({ mainId: mainPrimary.id, id: sec.id });

            // Update all secondaries of this now-secondary to point to the main primary
            db.prepare(
                `UPDATE contacts SET linkedId = @mainId WHERE linkedId = @oldId`
            ).run({ mainId: mainPrimary.id, oldId: sec.id });
        }

        // Refresh allContacts after merging
        allContacts = getAllLinkedContacts(mainPrimary.id);
    }

    // Collect all unique emails and phone numbers from the linked contacts
    const emails = new Set(allContacts.map(c => c.email).filter(Boolean) as string[]);
    const phoneNumbers = new Set(allContacts.map(c => c.phoneNumber).filter(Boolean) as string[]);
    const mainPrimary = allContacts.find(c => c.linkPrecedence === 'primary')!;
    let newContactId: number | null = null;

    // If the provided email or phone number is new, add as a secondary contact
    if ((email && !emails.has(email)) || (phoneNumber && !phoneNumbers.has(phoneNumber))) {
        const now = new Date().toISOString();
        const result = db.prepare(
            `INSERT INTO contacts (email, phoneNumber, linkPrecedence, linkedId, createdAt, updatedAt) VALUES (@email, @phoneNumber, 'secondary', @linkedId, @now, @now)`
        ).run({ email, phoneNumber, linkedId: mainPrimary.id, now });
        newContactId = result.lastInsertRowid as number;

        // Add the new contact to the allContacts array for response construction
        allContacts.push({
            id: newContactId,
            email: email ?? null,
            phoneNumber: phoneNumber ?? null,
            linkedId: mainPrimary.id,
            linkPrecedence: 'secondary',
            createdAt: now,
            updatedAt: now,
            deletedAt: null
        });
        if (email) emails.add(email);
        if (phoneNumber) phoneNumbers.add(phoneNumber);
    }

    // Build and return the unified identity response
    return {
        primaryContactId: mainPrimary.id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: allContacts
            .filter(c => c.linkPrecedence === 'secondary')
            .map(c => c.id)
    };
}
import db from '../db';

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

    const matchedContacts = db.prepare(
        `SELECT * FROM contacts WHERE (email = @email AND email IS NOT NULL) OR (phoneNumber = @phoneNumber AND phoneNumber IS NOT NULL)`
    ).all({ email, phoneNumber }) as Contact[];

    function getAllLinkedContacts(primaryId: number): Contact[] {
        return db.prepare(
            `SELECT * FROM contacts WHERE id = @id OR linkedId = @id`
        ).all({ id: primaryId }) as Contact[];
    }

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

    let allContacts: Contact[] = [];
    let primaryIds = new Set<number>();
    for (const contact of matchedContacts) {
        const primaryId = contact.linkPrecedence === 'primary' ? contact.id : contact.linkedId!;
        primaryIds.add(primaryId);
    }

    for (const pid of primaryIds) {
        allContacts.push(...getAllLinkedContacts(pid));
    }

    allContacts = Array.from(new Map(allContacts.map(c => [c.id, c])).values());


    if (primaryIds.size > 1) {
        const primaries = allContacts.filter(c => c.linkPrecedence === 'primary');
        primaries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const mainPrimary = primaries[0];
        const toSecondary = primaries.slice(1);

        for (const sec of toSecondary) {
            db.prepare(
                `UPDATE contacts SET linkPrecedence = 'secondary', linkedId = @mainId WHERE id = @id`
            ).run({ mainId: mainPrimary.id, id: sec.id });

            db.prepare(
                `UPDATE contacts SET linkedId = @mainId WHERE linkedId = @oldId`
            ).run({ mainId: mainPrimary.id, oldId: sec.id });
        }

        allContacts = getAllLinkedContacts(mainPrimary.id);
    }

    const emails = new Set(allContacts.map(c => c.email).filter(Boolean) as string[]);
    const phoneNumbers = new Set(allContacts.map(c => c.phoneNumber).filter(Boolean) as string[]);
    const mainPrimary = allContacts.find(c => c.linkPrecedence === 'primary')!;
    let newContactId: number | null = null;
    if ((email && !emails.has(email)) || (phoneNumber && !phoneNumbers.has(phoneNumber))) {
        const now = new Date().toISOString();
        const result = db.prepare(
            `INSERT INTO contacts (email, phoneNumber, linkPrecedence, linkedId, createdAt, updatedAt) VALUES (@email, @phoneNumber, 'secondary', @linkedId, @now, @now)`
        ).run({ email, phoneNumber, linkedId: mainPrimary.id, now });
        newContactId = result.lastInsertRowid as number;

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

    return {
        primaryContactId: mainPrimary.id,
        emails: Array.from(emails),
        phoneNumbers: Array.from(phoneNumbers),
        secondaryContactIds: allContacts
            .filter(c => c.linkPrecedence === 'secondary')
            .map(c => c.id)
    };
}
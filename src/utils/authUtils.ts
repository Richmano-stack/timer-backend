/**
 * Generates a unique email address based on first and last name.
 * @param firstName User's first name
 * @param lastName User's last name
 * @param existingEmails List of existing emails that match the base prefix
 * @returns A unique email address
 */
export const generateUniqueEmail = (
    firstName: string,
    lastName: string,
    existingEmails: string[]
): string => {
    const baseEmailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const domain = "@xcompany.com";

    let email = `${baseEmailPrefix}${domain}`;

    if (existingEmails.length > 0) {
        // Extract suffixes and find the next available number
        const suffixes = existingEmails
            .map(existingEmail => {
                const regex = new RegExp(`${baseEmailPrefix}(\\d+)${domain}`);
                const match = existingEmail.match(regex);
                return match ? parseInt(match[1]!) : 1;
            })
            .filter(n => !isNaN(n));

        const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 1;
        email = `${baseEmailPrefix}${maxSuffix + 1}${domain}`;
    }

    return email;
};

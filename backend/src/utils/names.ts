interface Named {
    name: string;
    title?: string | null;
}

export const formalName = (u: Named) => (u.title ? `${u.title} ${u.name}` : u.name);

export const shortName = (u: Named) => {
    const first = u.name.trim().split(/\s+/)[0];
    return u.title ? `${u.title} ${first}` : first;
};
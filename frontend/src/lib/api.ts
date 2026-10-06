export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const isForm = body instanceof FormData;

    const res = await fetch(`/api${path}`, {
        method,
        credentials: 'include',
        headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, data.message || 'Something went wrong');
    }
    return data as T;
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
};

  
import cloudinary from '../config/cloudinary';

function publicIdFromUrl(url: string) {
    const m = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
}

export async function deletePdf(pdfUrl?: string | null, pdfPublicId?: string | null) {
    const publicId = pdfPublicId || (pdfUrl ? publicIdFromUrl(pdfUrl) : null);
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch (err) {
        console.error('Could not delete PDF from Cloudinary', err);
    }
}
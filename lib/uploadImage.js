import axios from "axios";
import { fileTypeFromBuffer } from "file-type";

/**
 * Upload file to ikyy host
 * Supported all mimetype
 * @param {Buffer} buffer Media Buffer
 * @return {Promise<string|boolean>} URL string if success, false if failed
 */
export default async (buffer) => {
    const { ext, mime } = await fileTypeFromBuffer(buffer);
    
    const r = (Math.random() + 1).toString(36).substring(2);
    const filename = r + "." + ext;
    
    try {
        const formData = new FormData();
        const blob = new Blob([buffer], { type: mime });
        formData.append("file", blob, filename);

        const response = await axios.post(
            "https://ikyy-upload-file.hf.space/upload",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            }
        );

        return response.data.fileUrl;

    } catch (e) {
        console.log("Error uploading to ikyy:", e);
        return false;
    }
};
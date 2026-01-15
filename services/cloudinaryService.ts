import { Platform } from "react-native";

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export const uploadToCloudinary = async (file: string | File, folder?: string): Promise<string> => {
  try {
    const formData = new FormData();

    // ---------- HELPERS ----------
    const getMimeType = (uri: string) => {
      const ext = uri.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "png":
          return "image/png";
        case "webp":
          return "image/webp";
        case "gif":
          return "image/gif";
        case "heic":
          return "image/heic";
        default:
          return "application/octet-stream";
      }
    };

    const getFileName = (uri: string) => uri.split("/").pop() || "upload";

    // ---------- WEB ----------
    if (Platform.OS === "web") {
      if (typeof file === "string" && file.startsWith("blob:")) {
        // Convert blob URL to File
        const blob = await fetch(file).then(res => res.blob());
        const name = getFileName(file) + ".png"; // default extension
        formData.append("file", new File([blob], name, { type: blob.type }));
      } else {
        // Already a File object
        formData.append("file", file as File);
      }
    } 
    // ---------- NATIVE ----------
    else {
      const type = getMimeType(file as string);
      const name = getFileName(file as string);
      formData.append("file", { uri: file, type, name } as any);
    }

    // ---------- COMMON ----------
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder ? `hellomobile/${folder}` : "hellomobile");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudinary error:", data);
      throw new Error(data.error?.message || "Failed to upload image");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
};

// Upload avatar
export const uploadUserAvatar = (file: string | File) => uploadToCloudinary(file, "avatars");

// Upload post image
export const uploadPostImage = (file: string | File) => uploadToCloudinary(file, "posts");

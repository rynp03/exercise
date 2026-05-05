import axios from "axios";
import { decryptSipCredentials } from "../utils/decryption";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const authService = {
  login: async (username, password, domain) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/talkwisely/api/users/token/`,
        {
          username,
          password,
          domain: domain?.trim(),
        },
      );
      return response.data; // Returns { access, refresh }
    } catch (error) {
      console.error("Login API Error:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Step 2 & 3: Fetch and Decrypt SIP Credentials
   */
  getSipCredentials: async (accessToken) => {
    try {
      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Missing access token for permissions request.");
      }
      const response = await axios.get(
        `${BASE_URL}/talkwisely/core/permissions/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const encryptedData = response.data.data.encrypted_user;
      const decrypted = decryptSipCredentials(
        encryptedData,
        process.env.EXPO_PUBLIC_DECRYPTION_SECRET,
      );

      return decrypted;
    } catch (error) {
      console.error(
        "Permissions API Error:",
        error.response?.data || error.message,
      );
      throw error;
    }
  },
};

import axios from 'axios';

// Get Pinata API keys from environment variables
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = import.meta.env.VITE_PINATA_SECRET_API_KEY;

export async function uploadToPinata(file, name) {
  try {
    console.log("Uploading to Pinata with API key:", PINATA_API_KEY ? "Key exists" : "Key missing");
    console.log("Secret key exists:", PINATA_SECRET_API_KEY ? "Yes" : "No");
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata for the file
    const metadata = JSON.stringify({
      name: name || 'asset-document',
    });
    formData.append('pinataMetadata', metadata);
    
    // Optional: Add pinata options
    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', pinataOptions);

    // Use axios.postForm for better multipart handling
    const response = await axios({
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
      data: formData,
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': 'multipart/form-data',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY
      }
    });

    console.log("Pinata upload successful:", response.data);
    
    return { 
      ipfsHash: response.data.IpfsHash,
      pinataUrl: `https://teal-secondary-dog-544.mypinata.cloud/${response.data.IpfsHash}`
    };
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    console.error("Error details:", error.response ? error.response.data : "No response data");
    throw error;
  }
}

export async function uploadMetadataToPinata(metadata, name) {
  try {
    console.log("Uploading metadata to Pinata:", metadata);
    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    return await uploadToPinata(blob, name || 'metadata.json');
  } catch (error) {
    console.error("Error uploading metadata to Pinata:", error);
    throw error;
  }
}

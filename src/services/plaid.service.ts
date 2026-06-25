import { Request, Response } from "express";

export const plaidService = async (userId: string) => {
  const linkTokenRequest = {
    user: {
      client_user_id: userId,
    },
    client_name: "Plaid Test App",
    products: ["auth"],
    language: "en",
    webhook: "https://webhook.example.com",
    redirect_uri: "https://domainname.com/oauth-page.html",
    country_codes: ["US"],
  };

  //   try {
  //     const createTokenResponse = await client.linkTokenCreate(linkTokenRequest);
  //     return createTokenResponse.data;
  //   } catch (error) {
  //     throw new Error(`Failed to create link token: ${error.message}`);
  //   }
};

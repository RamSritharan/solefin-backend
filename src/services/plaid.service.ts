import plaidClient from "../config/plaidConfig";
import { CountryCode, Products, LinkTokenCreateRequest } from "plaid";

export const plaidService = async (userId: string) => {
  const linkTokenRequest: LinkTokenCreateRequest = {
    user: {
      client_user_id: userId,
    },
    client_name: "Plaid Test App",
    products: [Products.Balance, Products.Transactions],
    language: "en",
    webhook: "https://webhook.example.com",
    redirect_uri: "https://domainname.com/oauth-page.html",
    country_codes: [CountryCode.Us], // Replace with actual country codes
  };

  try {
    const createTokenResponse =
      await plaidClient.linkTokenCreate(linkTokenRequest);
    return createTokenResponse.data;
  } catch (err) {
    throw new Error(`Failed to create link token`);
  }
};

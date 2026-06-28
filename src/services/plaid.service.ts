import plaidClient from "../config/plaidConfig";
import {
  CountryCode,
  Products,
  LinkTokenCreateRequest,
  LinkTokenCreateResponse,
} from "plaid";
import { User } from "../entities/User";

export class PlaidService {
  private readonly userId: string;
  private readonly linkTokenRequest: LinkTokenCreateRequest;

  constructor(userId: string) {
    this.userId = userId;
    // Built during initialization so each method can reuse the configured request.
    this.linkTokenRequest = {
      user: { client_user_id: userId },
      client_name: "Plaid Test App",
      products: [Products.Auth, Products.Assets],
      language: "en",
      country_codes: [CountryCode.Us], // Replace with actual country codes
    };
  }

  async createLinkToken(): Promise<LinkTokenCreateResponse> {
    try {
      console.log("Link Token Request:", this.linkTokenRequest);

      const createTokenResponse = await plaidClient.linkTokenCreate(
        this.linkTokenRequest,
      );
      return createTokenResponse.data;
    } catch (err: any) {
      // Plaid puts the real reason in err.response.data — surface it.
      console.error(
        "Plaid linkTokenCreate failed:",
        err.response?.data ?? err.message ?? err,
      );
      throw new Error(
        err.response?.data?.error_message ?? "Failed to create link token",
      );
    }
  }

  // Exchanges the Link public_token for a permanent access_token and stores it
  // on the user. Returns the access_token.
  async exchangePublicToken(publicToken: string): Promise<string> {
    try {
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const accessToken = exchangeResponse.data.access_token;

      await User.update(
        { plaidAccessToken: accessToken },
        { where: { id: this.userId } },
      );

      return accessToken;
    } catch (err: any) {
      console.error(
        "Plaid itemPublicTokenExchange failed:",
        err.response?.data ?? err.message ?? err,
      );
      throw new Error(
        err.response?.data?.error_message ?? "Failed to exchange public token",
      );
    }
  }

  // TODO: add an assets method, e.g. createAssetReport(accessToken: string)
  // using plaidClient.assetReportCreate(...).
}

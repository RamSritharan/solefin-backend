import plaidClient from "../config/plaidConfig";
import {
  CountryCode,
  Products,
  LinkTokenCreateRequest,
  LinkTokenCreateResponse,
} from "plaid";
import { User } from "../entities/User";
import { Account } from "../entities/Account";

type AccountsBase = {
  account_id: string;
  userId: string;
  name: string;
  type: string;
  subtype: string | null;
  current: number | null;
  available: number | null;
  currency: string | null;
};

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

  async plaidAccounts(accessToken: string): Promise<void> {
    try {
      const res = await plaidClient.accountsBalanceGet({
        access_token: accessToken,
      });

      if (!res.data.accounts || res.data.accounts.length === 0) {
        throw new Error("No accounts found for the user");
      }

      console.log("Plaid accounts:", res.data.accounts);

      const accounts = res.data.accounts.map((account) => ({
        account_id: account.account_id,
        userId: this.userId,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        current: account.balances.current,
        available: account.balances.available,
        currency: account.balances.iso_currency_code,
      }));

      const savedAccounts = await Account.bulkCreate(accounts);

      if (!savedAccounts) {
        throw new Error("Failed to save accounts");
      }
    } catch (err: any) {
      console.error("Plaid get accounts failed:", err);

      throw new Error(
        err.response.data.error_message ?? "Failed to retrieve accounts",
      );
    }
  }

  // TODO: add an assets method, e.g. createAssetReport(accessToken: string)
  // using plaidClient.assetReportCreate(...).
}

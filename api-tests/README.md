# SoleFin API — Bruno Collection

A [Bruno](https://www.usebruno.com/) collection for manually testing the SoleFin backend.

## Usage

1. Open Bruno → **Open Collection** → select this `api-tests` folder.
2. Pick the **Local** environment (top-right). It points at `http://localhost:3001/api` — change `baseUrl` there if you run on a different port.
3. Run **Auth → Register** (or **Login**). The post-response script saves the JWT into the `token` env var automatically.
4. Every other request inherits Bearer auth from the collection, so they'll use that token without further setup.

## ID chaining

Create requests stash the new resource's id into env vars (`accountId`, `categoryId`, `transactionId`, `invoiceId`) via post-response scripts. So the typical flow is:

- Create Account → Create Category → Create Transaction → Get/Update/Delete
- Create Invoice → Update Status → Get/Delete

The Get/Update/Delete requests reference those vars in their URLs.

## Enum reference

- Account `type`: `checking`, `savings`, `credit_card`, `cash`
- Category / Transaction `type`: `income`, `expense`
- Invoice `status`: `draft`, `sent`, `viewed`, `paid`, `overdue`

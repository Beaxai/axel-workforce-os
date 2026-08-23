# Axel Workforce OS — UI Reference

This is a living reference for how the user interface, business concepts, and
underlying configuration relate to one another. Update it whenever a new screen,
term, workflow, or important UI decision is introduced or changed.

## How to Use This Document

- Start with the **Terms and Relationships** section when a label in the UI is
  unclear.
- Use **Screen Reference** before changing a screen, so related controls and
  data are not accidentally separated.
- Record agreed changes in **Interface Decisions** with the date and reason.
- Keep the language business-friendly. Technical implementation details should
  only be included when they affect what a user can edit, see, or do.

---

## Terms and Relationships

### Carrier

A **carrier** is the actual insurance company or PEO organization that can
ultimately issue coverage, quote a policy, decline an opportunity, or request
additional underwriting information.

Examples:

- An insurance company offering Workers' Compensation coverage
- A PEO organization offering payroll, HR, and benefits services

The carrier has the final underwriting decision. Its official quote, terms, and
eligibility decision override any estimate generated inside Axel Workforce OS.

### Market

A **market** is a specific submission option or program through which Axel
approaches a carrier. A market is more specific than the carrier itself.

One carrier can have several markets. Each market can differ by:

- Product lane, such as Workers' Comp or PEO
- Eligible states
- Eligible industries or class codes
- Appointment status
- Routing underwriter contact
- Internal appetite criteria
- Internal indicative pricing assumptions

For example, one carrier could have a California cannabis retail Workers' Comp
market and a separate Oregon cultivation market. They are related to the same
carrier but are different submission options.

### Recommended Naming

When the distinction matters in the UI:

- **Carrier** means the actual insurer or PEO organization.
- **Carrier Market** or **Program** means the specific submission option within
  that carrier.

The current **Network → Markets** area manages carrier markets/programs rather
than a carrier directory alone.

---

## Market Configuration

### Where to Edit a Market

Admins can manage carrier-market configuration from:

1. Open the left navigation.
2. Go to **Network**.
3. Open **Markets**.
4. Select the desired market.

The Market Detail screen contains the configuration that determines when a
market can be considered for a deal and how Axel prepares its internal estimate.

### Editable Market Information

An admin can manage:

- Market/program name
- Appointment status
- Effective and expiration dates
- Notes
- Active or inactive status
- Routing underwriters
- Appetite rules
- Rate sets and rate rules

### Structural Information

Some settings intentionally are not edited in place:

- **Market Type**
- **Product Lane**

These fields determine the market's routing identity. Changing either one can
invalidate historical routing and pricing, so the safer approach is to create a
replacement market/program.

---

## Appetite Rules

Appetite rules describe whether a market is a candidate for a particular
submission. They can use criteria such as:

- State
- Industry or vertical
- Class code
- Payroll range
- Premium range
- Headcount range
- Outcome: matched, conditional, or referral
- Routing underwriter

Appetite rules help Axel decide **which markets should be considered**. They do
not represent a carrier's final underwriting decision.

---

## Indicative Pricing and Rate Sets

### What a Rate Set Is

A **rate set** is an internal pricing table used by Axel to estimate a likely
annual premium and rank eligible markets.

Rate sets are not final carrier quotes. They support:

1. Internal indication/estimate generation
2. Market ranking
3. Selection of a likely Primary market

The actual carrier retains the final say after underwriting. It may issue a
different premium, decline the submission, add conditions, or request more
information.

### Recommended Plain-Language Labels

To avoid implying that internal values are carrier-approved final rates,
consider using clearer labels in the UI:

- **Indicative Pricing Tables**
- **Internal Market Rate Tables**
- **Estimated Pricing Rules**

### One Master Class-Code Table

The preferred model is to maintain one master table of class codes and baseline
rates. Markets should reference the codes or industry groups they accept instead
of copying the whole table into every market.

Each market can then store only what differs:

- Eligible class codes or industry tags
- State eligibility
- Minimum premium
- Rate multiplier or adjustment
- A small number of market-specific exceptions

This creates one source of truth for class codes while still allowing different
markets to be evaluated and ranked differently.

### Pricing Hierarchy

1. **Master class-code table:** baseline internal rate information
2. **Market eligibility/appetite:** whether the market should be considered
3. **Market adjustment or override:** internal estimate differences by market
4. **Carrier underwriting:** final official quote and terms

---

## Market Routing and Dispatch

### Internal Ranking

When a submission is eligible for multiple markets, Axel ranks them using
internal pricing and appetite information. The first-ranked market is called
**Primary**.

The ranking is an internal routing aid, not a promise of carrier coverage or
price.

### Delivery and Locking

After a provider accepts a delivery, the routing ranking is locked so Axel
cannot accidentally send the same submission again through a different market.

An ambiguous delivery status, `DELIVERY_UNKNOWN`, must be reviewed manually
with the provider. It cannot be automatically retried, cancelled, reset, or
rerouted.

---

## Dialog and Form Behavior

### Market Configuration Dialogs

Market configuration dialogs should:

- Open centered in the viewport
- Place a dark, dimmed backdrop over the rest of the screen
- Keep all underlying cards and page content behind the dialog
- Provide a visible close control and Cancel action
- Provide a clear Save action
- Close automatically only after a successful save
- Allow Escape and an outside click to exit without saving

### Current Implementation Note

The **Add Appetite Rule** dialog on the Market Detail screen follows this
pattern. It uses a top-level modal layer so it cannot appear behind Rate Sets or
other glass cards.

---

## Interface Decisions

Add dated entries here when the team agrees on a naming, workflow, or layout
decision that future edits need to respect.

### 2026-08-23 — Carrier vs. Market Terminology

- A carrier is the actual insurer or PEO organization.
- A market is the specific carrier program/submission option.
- Internal rate sets provide indicative estimates only; carrier underwriting is
  the final authority.

### 2026-08-23 — Market Dialog Layering

- Edit dialogs must use a true top-level modal layer, centered in the viewport.
- Underlying content must dim and remain behind the dialog.
- Save actions close the dialog after a successful update; Cancel and close
  actions do not save.

---

## Future Entries

When documenting a new screen or concept, add:

1. The business term and what it means
2. Where it appears in the UI
3. Who can view or edit it
4. What other screens or data it affects
5. Any important safety rule, limitation, or decision
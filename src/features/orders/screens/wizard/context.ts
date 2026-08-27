import { createContext, useContext } from 'react';

/**
 * How the wizard was entered, handed down from `NewOrderScreen`.
 *
 * The nested stack always *starts* on the customer step so every deeper step
 * has something to go back to; when the entry params already answer "who is
 * this for" (a customer picked in the search screen, or a saved draft being
 * edited) the customer step forwards once, as soon as the draft actually
 * carries that customer — `jumpTo` stays null while `awaiting` is true, which
 * is the gap where the seeding request is still in flight.
 */
export type WizardEntry = {
  jumpTo: 'ProductsStep' | 'CartStep' | null;
  /** Changes whenever the entry params do, so a *second* trip through "pick a
   * customer" re-arms the forward jump. */
  token: string;
  /** Increments every time the route regains focus. Re-entering the wizard
   * from the tab bar has to land on step 1 rather than on whatever screen it
   * was left showing (the success screen of the order just placed, say). */
  visit: number;
  /** Entered with no params at all — the tab bar's "+" — as opposed to
   * "for this customer" or "edit this draft". */
  fresh: boolean;
  /** The entry names a customer/order the draft doesn't hold yet: wait rather
   * than deciding there is nothing to forward to. */
  awaiting: boolean;
  /** Editing a saved draft: the customer is locked (an order snapshots them). */
  editing: boolean;
};

export const WizardEntryContext = createContext<WizardEntry>({
  jumpTo: null,
  token: '',
  visit: 0,
  fresh: true,
  awaiting: false,
  editing: false,
});

export function useWizardEntry(): WizardEntry {
  return useContext(WizardEntryContext);
}

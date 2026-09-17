# Menu

Owns customer menu browsing: sections, visible product availability, and slot presentation. `MenuScreen` accepts an optional initial section and group-order mode; the menu view model derives display states from shared domain data.

The client demo state supplies the menu and products. Product customization owns selection rules and prices; this module only uses those choices for the browsing preview. It does not own cart persistence or checkout.

Run `pnpm --filter @pizzaos/client test` for menu screen and view-model coverage.

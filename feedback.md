# Feedback Website

## Global

1. Map out all key words that show in hover previews to corresponding files in "docs/keywords/{keyword}.md".
   Website build take those as source of truth and use those text for preview text box and card text keywords description.
   Goal :
   1. Allow editing directly into docs/ file to update the website on rebuild.
   2. Allow creating manually new keyword file and automatically add them to website on rebuild

## "/sections/non-archetype/non-archetype/" page

1. Resize "catalog-hero-art" to be same ratio as original card image.
   Unzoom animation is too fast. Make it smooth and slower.
   Copy "section-tile" work. This is perfect implementation for zoom animation and ratio. (but keep unzoom)
   Make image bigger. Reduce margins top and bottom to allow increase in high. Overall height of "catalog-hero" should not change, only image size and margins/paddings.
   Apply to all archetype page.

2. Ash Blossom & Joyous Spring miss "Mill N" card preview hover ruling.
   Apply to all page where ash blossom "gallery-card" appear and all other "gallery-card" that have Mill X.

3. Update "Ash Blossom & Joyous Spring" car text in MSE and website.
   "1 Spell or ability whose effect interacts with Deck (draw, Mill X, search, etc.)" =>"1 Spell or ability whose effect interacts with Deck (Draw, Mill X, Search, etc.)"
   Draw and Search become bold Action keyword
   Add Search as text box hover preview.

4. Replace :
   "Create original Yu-Gi-Oh!-inspired cards playable under Magic: The Gathering rules. Adapt role, pace, and gameplay identity rather than translating literally." => "All cards not part of any defined archetype. Collection of classic Yu-Gi-Oh! Staples"

## http://localhost:4201/archetypes/nekroz/

1. Replace :
   "Nekroz is blue Ritual / Toolbox / Anti-Extra Deck."
   =>
   "Nekroz is Blue Archetype based on Ritual Creatures and Ritual Summon. Every Ritual creature . Nekroz concentrate an extreme amount of Search effect making it a extremely consistent in games. You have 3 category of cards :

- Ritual Creature that each can be discarded for an effect and have a on-field effect
- Non-Ritual Creatures aimed to be tributed for value. They all have On Sacrifice effect Triggered by Ritual Sacrifices.
- Non-Creature Ritual Summon Spell that allow to perform the Ritual Summon.
  This archetype is aimed for midrange grindy games using the power of Trishula to exile opponents resources and Valkyrus to prevent lethal damages.
  "

## http://localhost:4201/archetypes/burning-abyss/

1. Replace :
   "Burning Abyss is black Aristocrats / Graveyard / Value."
   =>
   "Burning Abyss is a black aristocrats based archetype. Send Burning Abyss creatures to the Grave by any means and get rewarded with free effects. Once per turn, you can play once for free 1 Burning Abyss creature from your hand. Quickly swarm your opponent with cheap and dispensable creatures."

## Cards Page

1. For http://localhost:4201/cards/ash-blossom-and-joyous-spring/
   I see in card text : "Counter(Cancel a spell or ability on the Stack; it resolves for no effect and goes to the Grave.)"
   Counter is native MTG keyword and does not need explanation text. Remove and update tests accordingly

## Nav

1. Replace "Essentia" brand text by wordmark logo

2. Move "rail-toggle" for nav collapse inside nav. duplicate to add same button to bottom of nav
   When collapse, show current top and bottom

3. When nav is collapsed, brand should still be visible.
   Best is probably to give top part of nav to header and integrate brand directly into header

## Docs & Blog

1. On enter Docs & Blog pages, migrate "reading-rail docs-rail" content to nav.
   Remove archetype redirections to put instead menu to select docs / blog.
   Delete current "reading-rail docs-rail" section.
   Keep current nav style for migration.
   Extends "reading-body docs-body" to take new free space left.

2. Add return to top page button feature at bottom of the page when able to scroll up.
   Must be bottom right of page,

3. Generate config file that i can manually edit to define order and sections of docs and blog articles in reading-rail docs-rail

# Feedback Website

## "New" Badge

Set css "top" property for tile-badge to "2rem".
Context : Current position hide manacost of cards which is essential information. This lower position to be on artwork only.

## Card preview ruling text

Must add keywords to docs and show them in card preview for :

- Resolution : Effect when non-permanent (instant, sorcery) card is resolving on the stack.
- Static : Passive ability. Do not use the stack. Active as soon card enter required zone to take effect. Default zone is Field.
- Triggered : Ability is activated anytime the condition is fulfilled after resolution of the trigger effect.
- Activated [[Sorcery/Flash]] : Ability that you activate yourself when you have priority and timing. Sorcery means only activable any time you can play a sorcery. Flash is MTG keyword : any time you have priority (even in opponent turn).
- Soft : You can only use this ability once per turn on the field. Other copies or new instance of the card (dies and reanimated) can activate or trigger same ability.
- Hard : You can only use this ability of {Name of the Card} only once per turn. All other copies of the same card cannot activate or trigger their effect.
- Linked : All *soft * abilities are grouped together. Same independantly for _hard_ abilities. If one the linked abilities is activated or triggered, all other other abilities cannot be used this turn following same *Soft * or _Hard_ rulling.
- Trap (in card super type) : Cannot be cast from hand. Can only be set face down.

## Header Menubar and Header

1. I want the site-header menubar to take priority and take the whole width over the nav drawer "desktop-catalog". Brand logo must always be top left corner of the website
2. From nav drawer, remove top button to collapse
3. Make nav drawer start (vertically) at header menubar border (all pages)
4. Make nav drawer bottom collapse button not take whole width of nav drawer. Instead, make it small square size justified right to right border nav drawer and website content. It must be same size as when collapse.
5. Remove non-archetype and Archetype bav group from nav drawer.
6. Add faint background color for each item in the list of nav items. Nackground color must match the archetype color (Burning abyss = orange, nekroz = blue, non-archetype = no color attributed so keep black)
7. On hover : faint background color become more intense to show selection
8. For responsiveness of header menubar :
   1. regroup "learn about essentia", "blog" and "deck" into a 3 dot dropdown menu on mobile size (400px lowest).
   2. "Learn about Essentia" text can be shorten to "Learn".
   3. "icon + Catalog" => can remove "Catalog text and only keep hamburger icon"
   4. "icon + Find" => you can remove "find" text to only keep icon
   5. add test to make sure everything hold on 1 row for 400px res. That specific do not error but show warning i app compilation and web console
   6. When reducing width to gain space :
      - first remove "about Essentia"
      - second reduce width of "Find" input up until becoming only a square icon button
      - regroup buttons into 3 dot dropdown menu
      - All all other same on a single row

## http://localhost:4201/archetypes

1. I want the text and image in catalog-hero section to be a bit more centered on the row. Either add padding for each or a justify something that help reducing a bit the space between the 2. Keep their current size.
2. Remove Hero image on mobile size (when everything is placed on 1 column and Title on page + description is placed before hero-image)

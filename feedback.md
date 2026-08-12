# Feedback

1. Update the generation script to show progress after this :

```
❯ npm run dev

> ygo-mtg-showcase@0.1.0 dev
> npm run cards:rebuild && node scripts/build-content.mjs && astro dev


> ygo-mtg-showcase@0.1.0 cards:rebuild
> "${PYTHON:-python}" ../.script/rebuild_open_packages.py

mse.render LOTA-0001-Alpha_0.1: 50 cards loaded, 0 checked, 50 rendered, 50 print masters
rebuild: 1 package rebuilt
```

Because its long without any information to user.

2. Optimize performance of card text effect parsing. It is very slow to just analyse text to make sure order of keyword are correct. Ask me questions to analyze the script but it could be worth making a full compiler like vendored in rust to maximize performance.

3. On the website, when hovering a card with mouse pointer. Instead of putting a duplicate of the image next to it, instead keep the duplicate but over the original image. This should you gain the space of an entire card. Also update the duplicate to take up to 75% height of the screen viewport based on available space for floating image. Make sure that the hover zone still be on the original card itself. Goal is make preview image almost as close as full size.

4. On the card page, add button under card image "show full size" that simply open the image file in browser

5. On the card page, remove new badge for related cards

6. On the card page, make sure to show no duplicates in related cards. If a card already is showed in "Same Archetype", dont show it in "Interacts with this card"

7. on the card page, the "Same Archetype" & "Interacts with this card" must use full width and be under the card image. when you start scrolling, first only the card tetx and rules scroll but when at the end, card and rules scroll together to give space for related cards. Basically bind card image and text & rules section.

8. on the crd page, Make card image bigger by removing min width like that (edited directly in web inspector):
   .card-detail .render-column picture, .card-detail .render-column img {
   /* width: min(100%, 25rem); _/
   /_ max-width: 25rem; */
   height: auto;
   margin-inline: auto;
   }

9. add the specific background for archetype pages :
   burning abyss => /home/aron/Downloads/burning-abyss-bg.png
   nekroz => /home/aron/Downloads/nekroz-bg.png

10. if not already existing, skip rebuild of all cards if nothing changed in MSE files

11. Make sure that the markdown system for docs and blogs can integrate pictures. add 1 test picture in http://localhost:4201/docs/ showed doc page using nekroz trishula card image. Is it possible to set its scale as % ?

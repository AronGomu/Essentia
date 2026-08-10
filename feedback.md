# Feedback

1. On the archetype page, for every archetype, the title and the description should have a semi‑transparent background and a border to make them pop out.

2. Update the script when starting npm run dev to not show the entire content of the JSON file. Instead, just show all the sets and the number of cards within the sets that are loaded and checked. So it should hold currently on a single line.

3. About the responsiveness of the header, finally, it seems that there is enough space for the three buttons, Learn, Blog, and Dex, so no need to make it a three‑dot menu. But if you can, make sure to test to see if it fits on 400 pixels.

4. Make sure that at a minimum width of 400 pixels, every time you show a list of cards you display only one card per row. On the homepage, the new‑cards section currently shows cards two by two; I want them shown one by one instead.

5. I want to update the templates. Every template used in the application—not only the website, but also the MagicSet editor and everything—should be HD, the same size as the frame for fusions in a resolution. Tell me the plan and let me know if it’s possible to implement this if I provide the upscaled template for all the missing frames.

6. I want to replace all the art used in the cards in the Magic Set Editor with the upscaled version of the original art. Update the Magic Set Editor file to replace them.

7. In the card page, for each card I want to update how the text is presented, specifically the keywords. It should work exactly like the preview for the cards with the keywords, the ruling of the keywords. First, after the type of the card, show the original text effect of the card, exactly the same as in the card image from Magic Set Editor. Then, below, have a rules section that lists every rule for each keyword, exactly as in the preview feature. Include the keyword on the card and all the others I added—activated, hard link, etc. They should use exactly the same base and source of truth as the cards, as the keyword showed in the preview.

8. In the related section, for every card on the card page, show all related cards in different categories. The first category includes cards of the same archetype—every card whose name contains the same archetype name. The second category includes all cards that can interact directly with one of the card’s characteristics. For example, Tour Guide from the Underworld can summon a Fiend from the deck, and because all Burning Abyss cards are Fiends, they are targetable, making them related cards. Apply this logic to every card and cache the information to avoid rebuilding it each time. When new cards are added to the website or the MagicSetEditor file, update the related sections accordingly.

9. On the homepage, make the “view all new 15 cards” link bigger, and show only 10 cards total instead of the current number.

10. On the homepage, greatly reduce the margin between the archetype title and the cards for each archetype.

11. On the homepage, remove the description below New Cards and remove the latest cards from alpha, beta, and release packages. And also lower the margins. Between the new card title and the first card.

12. On the homepage, reduce the margins between the first section with the hero content and the second section with the new cards. Make a test that ensures that on an HD screen you can see the title of the new cards on the first load of the page. You don't need to see the cards themselves, but you need to see the title.

13. Update the text in the button “See what changed” to “View new cards”.

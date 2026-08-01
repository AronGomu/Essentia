# Legend of Alpha — Introducing Yu-Gi-Oh! × Magic

## Video goal

Introduce project at surface level: why it exists, core design choices, major differences from Magic: The Gathering, intended feeling, and two Legend of Alpha starter decks.

---

## Opening

The good old yugioh, but in Magic ?

Hi everyone and welcome on the presentation video of my beloved project : YGO X MTG: Essentia

My goal with the Essentia project is to allow you to play YGO cards in the Magic rule system but with the feeling of playing YGO.

It started as the idea of making a magic cube using adapted YGO cards.
Then it slowly evolved into baically making an entire new game derived from the Magic the Gathering rules systems.

It happened because I realised it was not really possible to rawdog the cube I was making.

The deck building in Yu‑Gi‑Oh! is based around archetypes and highly synergistic cards.
To start and play a deck, you need to know almost every card in it because each card will search another, and you need to know the sequences to chain your cards properly.
But I cannot expect a first‑comer to my cube to know the synergies and the archetypes of my cube.

So I had to make structure decks for each archetype I was building that can be played against each other to show how the archetypes play out.
That should be the first exposure for players for the cube.

So my current goal, is to make 6 structure decks for 6 archetypes, each containing 50 cards, 40 cards main deck and 10 cards sideboard.
And if you remove the basics of those decks and add some amount of cards, it should make a playable cube for at least 6 player.

## Who I am

But first, who i am ?

I started my TCG career as a YGO player very early, around 2009. I started to go to weekly local tournaments at the synchro release when i was 10 years old.

I played on and off during this synchro era.
I remember first playing horrible synchro structure deck, then a bad zombie synchro deck, then mixing it with lightsworn and then switching to blackwing when it has already fallen.
I was on a budget -- as most kids were at the time.
So I had to do with what I had.

Then I started to play seriously at the end of HAT format up until the start of PEPE format.
I was heavely invested in Dueling Network (the previous version of Dueling Book) and played a lot.
IRL, I was a budget burning abyss player.
I lived through DUEA and Nekroz format and I was blessed with my deck avoiding almost all bans in my competitive burning abyss player career.

I hard stopped the game at PEPE format because I started to hate the 10 minutes combo turns into scoop format.
It was not my jam at all.
I loved the game for heavely interactive format like Shaddoll, Burning Abyss and Nekroz.

I still came back from time to time for T0 format like Zoodiac and Tearlaments and I still follow YGO content from time to time but I am not invested in the game at all now.
I am what you would call, a YGO Boomer spamming the "In my times, YGO was great because we played more than 2 turns".

As you guessed, I transitionned to Magic during its Golden Era : 2016 Modern format.

I started playing Jeskai Control and Death's Shadow into that pure goaded format and became a serious MTG competitive player up until FIRE design ruined everything.

I retranched myself into the Legacy with a local community in my city.

To be honest, I am disgusted by the directions of both YGO and MTG.
The FIRE and Commander design is horrendous.
It justs encourages non-interactive game and poison every format it touches.

And YGO never solved the combo issue.
I honestly dont understand how there is still people playing the game after getting shat on by Konami for decades.
But I guess they like to get raped every banlist, I mean, I dont know man, What the fuck is wrong with them.

## Why I am making this

Since i transitionned inot Magic, I always missed the high power and interaction of YGO games.

Legacy format is the closest cousin but its clearly still not the same.

There is something missing and I dont really know how to describe it in 1 word.
Its all the floating effect, the insane value you make, moving pieces of cardboard around all the rime -- like man, just overlaying cards into an xyz is so satisfying its crazy dude.
I feel like MTG has not enough game action in one turn and you dont move enough card board around doing cool stuff.
I am the type of guy who love to search 5 times in my library, ritual summoning valkyrus and sacrificing it to leave my board empty just to make a +1, if you know what i am talking about.

But I also love the MTG rule system. I love the land system and the overall feeling of the game.

So i wanted to experiment with recreating that YGO feeling into the MTG game system -- and here we are, with Essentia

## Core idea

So the foundation is Magic. Cards use Magic's rules engine, mana system, colors, stack, combat, and familiar card types.

But the design target is not normal Magic Limited or Constructed.
This is a closed environment, balanced against itself.
As you saw, cards are completly out of the Magic norms.
You get to have 1 mana 3/2 that can be played for free and when it is send to the graveyard from anywhere, it reanimates another creature from the grave. (Cir)
Of course, in MTG, even in Legacy, that would be completly broken.
But in my envionment, it is the norm.
That's what i mean by adapting YGO feeling into Magic.
Everything is broken, so nothing is.

However, 1 major difference with YGO, is that I still gave cost the cards.
Yes, the cost is minimal.
It's only 1 mana.
But it is still a limitation and I hope, it allows for interactive games playing on several turns, similar to Modern.
Remember, my goal is to recreate the feeling of YGO using the MTG system, not be an exact copy of YGO transposed into MTG.

## YGO specifics translated into MTG

Ok now, let me list how I translated differents stats and mecanics into Magic.

### Extra Decks

The first one is the Extradek, and it behaves exactly like you would expect from Yu‑Gi‑Oh.

So, Fusions, Synchros, Xyz and Links start in the sideboard and they can be played exactly like in YGO, directly from the sideboard executing their summoning mecanics.
And for most of them, summoning them, meaning putting them into play, does not cost mana.

### Life, Power and Toughness

[REDO POWER AND THOUGHNESS, CAN BE MORE PRECISE]

For the Power and Toughness, I simply adapted so that each multiple of 500 ATK is equivalent to 1 power and 500 DEF is 1 toughness.

For exemple, for Cir, it was a 1600 ATK and 1200 DEF, so it becomes a 3/2 rounded down.
I did the same for all other monster cards.

I thought about another solution, where I updated the MTG life points to be 80 life instead of 20, so I could simply remove 2 zeros from the ATK and DEF for each cards and it would perfectly match the ratio and precision for the translation.
Cir for example would become an 16/12.
This way, it is the same number of direct attack for Cir from YGO to win.

But for the first version of the game, I want to stay as close as possible to MTG stats-wise.
So I choose against this for now.

### Levels and Mana

Levels are the hardest thing to translate to because they are very different from Mana Values from MTG.
I cant really just transpose level into Mana Cost because 4 mana is already a lot in MTG and it would break the YGO feeling if the game were that long.

So I just adapted so that :
Level 1 to 4 = 1 Mana
Level 5 to 6 = 2 Mana
Level 7 to 9 = 3 Mana
Level 10 to 12 = 4 Mana

Because of this, I lose a lot precisions for synchro and xyz summoning.
Now Level 1, 2, 3 and 4 archetypes can all use easily the same XYZ and Synchro.
Same for Ritual summoning.

I choose to do this because its simple and I dont loose the YGO feeling, its just less fidelity for archetypes recreation.

### Attributes and Color

Color was a big headache. Because, even though YGO has attributes, they dont really matter.
Its just another type.

In Magic, each color can do specific things well, not well or just cant.
In YGO, they all can do everything.

Also, YGO has an HEAVY bias on LIGHT and DARK.
And to make a cube, color balance is important.

Also also, LIGHT is White, DARK is Black, FIRE is Red, WATER is Blue, EARTH is Green and then... what do i do for WIND ?

After some reflexions, I decided to go Vibe based. I dont care about color balance and the color pie to feat the YGO feel.

Another problem is that the XYZ, Synchro, Links mechanics completly ignore colors by defaults.
You can use 2 DARK to Xyz Summon a WIND, that's normal in YGO.
So I decided to do the same for Essentia.

So Yeah, dont be surprised to see wacky colors.
For now I just throw shit at the wall and I will see what stick.

### FLIP, Trpas and face down cards.

Another mecanic specific to YGO are the trap cards.

MTG has morph that is a bit similar but that's all.

So 1 big change I made is to add a global rule in the game that now : any permanent card can be played face-down.

You pay the same mana but you can choose to play it face down.
You must announce if its a creature or non-creature and make sure to identify it correctly.
Like in YGO, vous ne pouvez pas le retourner le tour où vous le jouez.
Vous devez attendre un tour entier avant de pouvoir activer le piège. Et si ce n’est pas un piège mais une créature, vous ne pouvez pas le retourner à vitesse instantanée ; à la place, vous êtes autorisé à bloquer, à utiliser la créature comme bloqueur ou attaquant.
Basically, I made the rules to make play it out and feel exactly like you would expect in Yu‑Gi‑Oh.
If the creature flips, it triggers its effect, and if it lived one turn, you can flip it yourself and trigger the flip effect.
For the first set, there is no flip effect. For the first batch, there is not yet a flip effect, but the Shaddoll archetype is soon to come with a bunch of flip effects.

## Problems and how I solved them

### YGO card effect text purge

One problem I had writing the effect of the cards was that I didn’t want the card text box completely full of text, like in Yu‑Gi‑Oh.
Since it is a custom set, I allowed myself to mix Yu‑Gi‑Oh PSCT rules formatting and MTG keywords to condense the text as much as possible.
Even then, it wasn’t enough, so I worked on reducing the unnecessary words.
The text may seem a bit machine‑like, but it is very readable once you know the keywords, and it doesn’t intimidate you when you understand the context.
But that's just my opinion.
As you can see, I also try to use as much as possible the styling with bold and italic text to make the actions and zones pop out on the card, within the constraints of the Magic Set Editor software.

### Chaining Tutors and Combo Feels

Another problem that I had is to find a solution to allow tutor chaining and combo fields of Yu‑Gi‑Oh in the game system of MTG.
For now, the best solution I found was to simply allow tutors and search effects to basically be cast for free.
That's one of the positive points of YGO.
Because everything is sealed into archetypes, you can basically do anything you want, as long as you balance the other things in the archetype.
The effects can be as broken as possible, like a free tutor, as long as the other cards are not too good; it's fine.
So that's why, at the moment, all the search effects of the Nekroz cards and all hand trap‑like effects are free.

### Hand Traps Interactions

Also, that's not really a problem per say, but all the hand traps and interactions, even the minimal ones, I try to make free, so that the player who tries to interact and stop the opponent always has the upside over the proactive player.
Because, by nature, the proactive player is the one naturally advantaged in this position.

### One Turn Kill

Printing very minimal direct damage effect.

No cards have haste for now.

Easy to create big board for both player.

Also easy to brake them.

I dont want fast games.

I dont want infinite slogs

Need to playtest to see.

Concerning the one‑turn kill problem, because Magic has summoning sickness, the issue resolves itself.
Even if I give many free effects, creatures cannot attack the turn they enter.
Also its both players that receive numerous free effects, it is not one‑sided.
Additionally, unlike YGO, I do not plan to design or adapt many direct‑damage effects or cards with haste.
Firstly because haste does not exist in YGO — everything already has it.
Secondly, giving haste to too much creatures would not align with the interactive gameplay I want to create with this project.
I will give haste to creatures.
There is a solution to give haste to more creatures in the future, and maybe add a rule to specify that you cannot attack on the first turn, like in Yu‑Gi‑Oh.
That's a thing I can do.
But for now, I want to stay, as much as possible, within the game system of Magic the Gathering.

I want to stay aware of games that become a slog. In Magic, mana naturally restricts the number of actions you can take each turn. Even though the creatures are overpowered compared to Magic, if both players always have many creatures on the board, the block system prevents you from attacking effectively and gaining value from attacks. This risks turning every game into a card‑advantage slog, where the win condition becomes who decks first rather than who kills the opponent. Consequently, players stop trying to kill each other and both stall for as long as possible.

For now, since I have not played a single game of this project yet, I have no idea if it goes that way, but it's something I am very aware of, and I try to take it into account in my adaptation design.

But I think having effects like Raigeki and Dark Hole at one mana can solve this issue and allow us to clear the board to attack.

### Match Length

Another possible problem is the match length.
Because this project aims to produce highly interactive gameplay, which requires both players to make many decisions, all of those decisions take time for the player to compute and process.
If you have long games with many turns and numerous actions and decisions, that results in a very long game.

But if you design your game so that each deck see most of its cards every game, the variance of each game drops, making it more like chess where you have access to all your resources.
Because of that, I think it’s possible to allow very long games on average, compared to other games, and to change the competitive system from a best‑of‑three format to a single game per match.

By that I mean that if I do a cube with this project, instead of doing best‑of‑three games matches, I just do one single game.

### The Mulligan

One thing that may seem a bit weird, but is related to the match length, is the decision to change the mulligan.

The new mulligan rule is: you may take any number of cards from your hand, put them at the bottom of your deck, and draw the same number of cards.
After that, there are no more mulligans.
Exactly Like Hearthstone.

The reason for this change is that I hate how long it takes to start a game of Magic. This method eliminates the shuffle, speeds up the start, and, honestly, if you don’t see a single land in the first 14 cards of your deck, you deserve to lose the game. It’s just variance my guy.

## Problems I did not solve yet

### Lands

One problem you can consider is the land part. Currently, in Yu‑Gi‑Oh, many decks exceed 40 cards because the decks became so consistent and the engines are so big that you want more space in your deck to reduce the chanches of drawing bricks.

However, currently, everything I design is to be played with 40-card decks and a 10-card sideboard that contains only extra deck cards.

Even if almost every card costs one mana, the lands take at least a third of your deck.
That means that in a 40‑card deck, you have between 13 and 14 lands to be optimal.
You may want a bit more to ensure land drops each turn and overpower your opponent with more mana, because almost every card in Yu‑Gi‑Oh! generates some card advantage one way or another.

That means in reality you only play with 27 or 26 actual cards in your deck. As I said, that's very very tight for Yu‑Gi‑Oh.

However, I know that there is the game Duel Links that makes you play with only 20-card decks, so I guess it works. My current solution is to restrict to only two copies of every card.

Also, having a lower deck size can allow the game to complete faster from decking and make it an actual true win condition.

The other thing with lands is that there is no effect in Yu‑Gi‑Oh that references land or mana generation because that concept just does not exist in their game.
I would like lands to interact with the Yu‑Gi‑Oh side and vice versa, but I don’t know how to do it properly.
My first idea is to create custom lands with effects that interact with Yu‑Gi‑Oh cards, basically adding new cards to the archetypes.
I really want to reduce the variances of Manafloods or Manascrew as much as possible while keeping lands as an active card type.
The best way to do that in Magic -- without creating a second deck dedicated to lands -- is to make lands as modal as possible so you can easily cycle a land into an active card or cycle an active card into a land.
If you discard or exile it, that downside could discourage you from doing it by default, because if the game goes long it would leave you with fewer resources.
That’s my first idea, but it requires a lot of tinkering by creating new custom cards, and I don’t want to do that for now.

## What's planned for the Alpha 0.1 of Legend of the Alpha

OK, so you got the idea. What is planned for the Alpha 0.1 of the first set "Legend of the Alpha" ?

I want to create two starter decks so I can start to playtest this project.

And I will do it with my two preferred archetypes in Yu‑Gi‑Oh.

### Starter deck one: Burning Abyss

The first one is, of course, Burning Abyss. It was my deck when I was a competitive player, and I always loved playing all iterations that deck.

As you can expect, you have all the iconic cards of the archetype. Of course, we have Tour Guide, Graph, Cir, Scarm, Farfa, Dante, Virgil, Rubic. They are all here for the first iteration.

Briefly, I kept the 3 main mechanics of the archetype.
The first is that if you control a creature that is not a Burning Abyss, it will destroy itself.
You can play them without the requirement of having no spells or traps on the field, allowing you to play them freely from your hand once per turn.
I added the once‑per‑turn limitation to prevent the deck from becoming a flood of Burning Abyss cards and a bunch of Dante, but I feel it was too fast for Magic: The Gathering, so I may change that later.
As I said, it's just an alpha.
Of course, the third effect is that they all have effects when sent to the graveyard, and I tried to stay as close as possible to the original versions.

Also, as you can expect, this deck focuses mostly on Xyz summoning. I added Dante, I added Virgil as a synchro because he's very easy to understand, but most cards in the extra deck are Xyz.

### Starter deck two: Nekroz

The second archetype is Nekroz.

Same as Burning Abyss, you can expect Senju, Manju, Prepration of Rite, Brionac, Clausolas, Shurit, Trishula, and Unicorn to be staples of the archetype.

As I said before, all the search and hand effects of the archetype are free; only playing the cards costs mana, for the ritual summons, for example.

I kept ritual summoning exactly the same as in Yu‑Gi‑Oh, so you cannot play a ritual creature; you have to ritual summon it using a ritual‑summon spell.
The only way to play ritual, fusion, Xyz, or synchro creatures without first using their specific summoning methods is by ignoring their summoning restrictions.

## Why these two decks

Because the effects of the cards are so similar, I expect to have the same feeling when playing the game, when playing the decks against each other, as I felt ten years ago when I was playing Burning Abyss against Necroz.

So that's why I take those two decks, because if I can't make it work for my favorite archetype, there is no point in the Essentia project at all.

## What I will avoid

Because I am a good game designer, there will be no floodgates or lingering effects.
So you can't expect Drone Lock Bird, Abyss Dweller, or Macro Cosmos.
Every card that you and I hate, I will make sure never to add it to Essentia.

## Closing

I will soon release a video for showing all the cards from the 0.1 Alpha of Legend of the Alpha Set.

Subscribe to not miss any update from Essentia.

Like you see, I am working very hard to share this project. And I would love it if you try it out yourself with your friends.

You can go to this website to see all the cards, decklists, sets, new release and to print the cards yourself to proxy and play with your friends.

The project itself is open source.
IP and Copyright is evil so you can do anything you want with any of the content I shared.

You can also easily contribute yourself if you want to by submitting pull requests on my github project.
I built it using IA agents and IA's are first class citizens in this codebase.
So just pull up your Claude or Codex and you can start contributing immediately.

I also appreciate any constructive feedback or supportive comments.

On this note, GAME ON GAMERS !

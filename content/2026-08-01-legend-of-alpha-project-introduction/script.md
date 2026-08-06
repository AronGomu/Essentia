# Legend of Alpha — Introducing Yu-Gi-Oh! × Magic

## Opening

The good old yugioh, but in Magic ?

Hi everyone and welcome on the presentation of my beloved project : YGO X MTG: Essentia

My goal with Essentia project is to allow you to play YGO cards in the Magic rule system while keeping the feeling of playing YGO.
Hence the name : Essentia.
We keep the essence of YGO in another game system.

This idea started from me trying to create a magic cube using Yu‑Gi‑Oh! mechanics and cards.

It was a classical Magic cube trying to implement the fusion mechanics from Yu‑Gi‑Oh, and it was a mix of Magic cards that synergized pretty well with the fusion mechanics, and new Yu‑Gi‑Oh cards that I translated to support the new fusion mechanic.

As most first tries, it was not really a great success, but it inspired me to make it better.

And the thing that I missed the most from that prototype was that I was not really feeling the Yu‑Gi‑Oh feeling when playing.

I thought a lot about it, and the result is this project: trying, with the goal in mind, to replicate as much as possible the feeling of playing Yu‑Gi‑Oh! using the Magic: The Gathering rule system.

This project started to become very complex because I faced one major problem, and that problem was the complexity for a first-time player of my cube.

Because I try to implement Yu‑Gi‑Oh mechanics and Yu‑Gi‑Oh archetypes, I faced the same exact horizontal complexity problem, where you need to know almost every card to determine which cards are valuable and which are not.

The only solution I found to this problem, that is not really a solution, was creating structure decks that I can give to new players so they can play a few games before the actual cube and familiarize themselves with at least one or two archetypes and how the games played.

So my current goal, is to make 6 structure decks for 6 archetypes, each containing 50 cards, 40 cards main deck and a 10 cards sideboard.

And if you remove the basics from those decks and then add an arbitraty amount of cards, it should make a playable cube for at least 6 player.

That's my target for my first set, Legend of the Alpha.

## Who I am

But first, who i am ?

I started my TCG career as a YGO player very early.

I started to go to weekly local tournaments when synchros releases when i was around 10 years old.

As most kids do, I played on and off, Not very seriously -- I was just a kid with kid budget decks after all -- up until the Hat format.

That's where I started to become much more serious about the game. I was a very active participant in the French forum OTK Expert, and I started to play a lot online, especially on Dueling Network.

Maybe you know Duelingbook, a current platform where you play Yu‑Gi‑Oh! in a browser online against other players.

Well, Duelingbook was its predecessor.

Then, a few years after the Duelist Alliance was released, I became a Burning Abyss budget player, and the two years of Burning Abyss, Shaddoll, and Nekroz formats were my own personal golden age of playing the game.
And I think I became pretty good, becoming one of the best players in my local area, and I did attain the top 100 on Dueling Network, which, from my memory, was not a small feat.

I truly loved playing Burning Abyss, Nekroz, Shaddoll, and Spellbook.
Those are my four favorite archetypes of all time.
Kozmo is a close fifth.

I really did not like the direction of Yu‑Gi‑Oh, going to big first‑turn combos that break the board.
I don't find those kinds of games interesting at all.
It strayed a lot from Shaddoll, Burning Abyss, and Nekroz, which had very interesting and interactive games most of the time.

I still came back from time to time for Tier 0 format like Zoodiac and Tearlaments just to experience the thing.
I still follow YGO content but I am not invested in the game at all now.
I am what you would call, a YGO Boomer.

As you guessed, I transitionned to Magic during its Golden Era : 2016 Modern format.

I started playing Jeskai Control and Death's Shadow into that pure goaded format
I became a serious MTG competitive player up until FIRE design ruined everything.

Now, I am mostly a Legacy when I played a card game.
Which is funny because it's the closest format to Yu‑Gi‑Oh that you can actually play in Magic.

## Why I am making this

Since i transitionned inot Magic, I always missed the high power and interaction of YGO games.
Ever since I transitioned into Magic, I always missed the high power and interactions of Yu‑Gi‑Oh games.
As I said, the legacy format is the closest, but it's still not the same.

I am the type of guy who loves searching five times in my library, ritual summon a Valkyrus, and sacrificing my Manju and my Valkyrus just to make a plus one using the exiling Necroz ritual spell.
You just can't do that in Magic.

Also I love the Magic rule system and lands.

I want to give a good try mixing both the feeling of power and velocity from Yu‑Gi‑Oh, while still using the mana system from Magic: The Gathering.
And also, maybe the mana system is the one missing thing that allows us to play actual games of Yu‑Gi‑Oh that don’t always devolve into a board-breaking of a first turn combo.

## Core idea

What's the core idea?

The foundation is Magic.
Cards use Magic's rules engine, mana system, colors, stack, combat, and card super and sub types.

But the design and power level target is not normal Magic Limited or Constructed.
This is aimed to be played in a closed environment, balanced against itself.
As you already saw, the cards I show you are completely out of the norm of Magic.
In my environment, having a 4/3 for one mana that can also be played for free, and when it is sent to the graveyard from anywhere, it reanimates another creature; that's the norm.

If everything is broken, then nothing is.

And that's kinda the vibe of Yu‑Gi‑Oh.

Unless you give the possibility to kill your opponent in one turn, having overstat cards and effects is not really a problem as long as you give time to the opponent to do the same thing.

Also, you will see that I still gave mana cost to the cards, and almost every mana cost is just one mana.
There are many effects that are free, so I hope to strike a good balance between mana cost and free cards to allow the Yu‑Gi‑Oh feeling of chaining cards together while providing enough space for several interative turns to be played.

## YGO specifics translated into MTG

Okay, now let me give a list of different Yu‑Gi‑Oh! specific mechanics that I translated into Magic: The Gathering raw systems.

### Extra Decks

The first one is the Extra deck, and it behaves exactly like you would expect from Yu‑Gi‑Oh.

Fusions, Synchros, Xyz and Links start in the sideboard and they can be played exactly like in Yu‑Gi‑Oh, directly from the sideboard, using their summoning mecanics.
And by default, summoning them, meaning putting them into play, does not cost mana.
Fusions are the only exception because I consider playing a fusion spell like playing a creature from your hand, and it should cost at least one mana most of the time.

One thing I should not forget to mention is that for all those, you have to first summon them properly to be able to summon them afterward without using their summoning mechanic.
And all types that come from the extra deck, like in Yu‑Gi‑Oh, return to the extra deck if they are shuffled into the deck or bounced to the hand.

### Life, Power and Toughness

For the power and toughness of creatures, I used a very simple rule.
I made a ratio based on Yu‑Gi‑Oh, where the attack or defense is divided by the life points.
I tried to keep that ratio as close as possible in Magic, converting it into a power and toughness number for 20 life.

8,000 life divided by 20 is 400, so that means that for every 400 attack or defense, that is equivalent in my system to 1 power or toughness.
For the card I showed previously, Burning Abyss Cir in Yu‑Gi‑Oh, he has 1600 attack points and 1200 defense points. Converted to magic ratios, that becomes a 4‑3, because 4 × 400 is equal 1600 and 3 × 400 is equal 1200.
If the card has only 1500 instead of 1600, it becomes 3 because I always truncate the number down.

As you can see, this is very straightforward.
I don't plan to make manual changes to the stats.
I want to keep as much of this system as possible, because it is much simpler, and I can just adapt the actual effects that I cannot translate as easily to balance the card if balance is needed.

There is just a single thing that is bugging me, and that's the fact that I have to truncate down the stats. It would be possible for me to update the life in Magic to be 80 life instead of 20, so that I would not have to truncate the numbers for 99% of the Yu‑Gi‑Oh cards. However, I don't want to do that right now, because I would stray further from the actual Magic rule systems.
And also the stats of the cards will be very weird for a Magic player because you have to multiply the power and toughness of every creature by 4.
So for example, Burning Abyss Cir would be a one‑mana 16/12.
And to me, that looks weird and doesn't fit an actual Magic card's stats.

### Levels and Mana

Concerning the levels and mana, it was one of the hardest things to translate into Magic because the two systems are very different from each other.
You can't really translate the levels directly into mana cost, because it just breaks the mana generation system of Magic: The Gathering.
And also in modern Yu‑Gi‑Oh, levels are more like colors or types that allows you to play specific cards that synergize with them, based on their specific levels, rather than a mana cost.

So I decided to dumb down the system like that.
Monster level 1 to 4 costs 1 mana, level 5 to 6 cost 2 mana, level 7 to 9 cost 3 mana, and level 10 to 12 cost 4 mana.
With that system, and the speed I aim for in my games, it basically means that every card that costs more than 2 mana is not really playable for its mana-cst, like in Yu‑Gi‑Oh.
Unless it is completely broken, in modern Yu‑Gi‑Oh, you cannot sacrifice two creatures to play a Level 7 monster.

But because of this simplification, I now lose a lot of precision for synchros, Xyz and Ritual summoning.
Unfortunately, that's one of the trade-offs to use the magic game system.
So that means every archetype, whatever its level — level 1, level 2, level 3, or level 4—has now access to the same exact Xyz and Synchros.

This is less faithful to recreate archetypes, but I think that's a fine cost to make.
Because my main goal is really to keep the Yu‑Gi‑Oh feeling when playing the actual game, and not do a perfect recreation of the archetypes.

### Attributes and Color

Now, the Attributes and Colors.

Converting the attributes into color was a big headache.
Because there are two main problems.
The first one is that attributes in Yu‑Gi‑Oh! are basically just another type for the cards, because there is no mana system and no deck‑building restrictions based on the attribute.
The second problem is that in Yu‑Gi‑Oh you have six attributes, but in Magic you have only five main colors.

There are five attributes that are quite easy to translate. For example, light is white, dark is black, fire is red, water is blue, and earth is green. But the missing attribute, wind—where do I place it?

Also, if I want to make a faithful adaptation of the cards into Magic while considering color balance in my cube, this becomes quite hard to balance.

Then I thought more, and a third problem appeared: Xyz, Synchros, Fusions, and Links summon mechanics do not care about the color of the cards.
Which, in a magic context, is very weird.
And totally break the color pie.

So I decided not to care about the color balance in my cube, and to not to care about the color pie specifics.

I decided to keep the color as faithful to the attribute as possible.
And for the wind monsters, I just attribute a color based on the vibe of the card.

### FLIP, Traps and face down cards.

Another mechanic specific to Yu-Gi-Oh! is the Trap Cards and more generally, face-down cards for monsters and magic spells.

Magic has Morph, which is a bit similar, but it's still very different in how it actually plays.

I made one big change. I added a new global rule to this version of the game: any permanent or trap card can now be played face down for the same mana cost.

So you pay the same amount of mana that you would have to play the card normally, but you can choose to play the card face down.
You must announce whether it’s a creature, and you probably need a counter to identify the face‑down card that can block or not

And exactly like with Yu‑Gi‑Oh, you cannot flip the card the turn you played it; you need to wait until the next turn.
For creatures, you cannot flip them at instant speed; you have to wait for your turn at sorcery speed.
But for traps, which is a new supertype that are instants you must play face down before you can activate them, You can activate them at any time.

And exactly like in Yu‑Gi‑Oh, whenever you flip a flip monster, that triggers its effect.
And there are effects that can Turn cards face up or face down, with the possibility of triggering the effect again.
I am currently working on the shadow archetype that is in part based on that mechanic.
But that will come in the next batch.

## Problems and how I solved them

Those were the main translations from Yu‑Gi‑Oh to Magic I had to do.
New problems have appeared that I need to solve, so here they are.

### YGO card effect text purge

The first problem was the size of the text box from a Yu‑Gi‑Oh card to Magic.
As you probably know, Yu‑Gi‑Oh is known for its terrible text‑box management, and they basically cram as much text as possible within a tiny box.
And because I like to think I am a good game designer, I wanted to avoid that and make the text-box of my cards as clean as possible for players.

However, there is one good thing from Yu‑Gi‑Oh, the PSCT syntax for card effects.
That makes reading conditions, costs, and effect resolution very easy to understand once you understand the PSCT syntax, which is very simple.
Basically, the first part of the effect is always the condition; if there is a condition, then it's separated with a colon, then you have the cost of the card, which is then separated with a semicolon, then you have the actual resolution of the effect of the card.

So I took that from Yu‑Gi‑Oh, then I took the keywords from Magic.

As you can see on the cards, I have a very heavy use of keywords, and I created a bunch of new keywords to compactify the text of the card, making it more readable.
The cost of that is, for a new player reading the cards, they have to constantly check either the website or a rule text to know what the keyword means, but once you have integrated all the keywords, it becomes very easy and very fast to parse any card effect.
But that's also why my cards do not read like Magic cards.
I took the liberty to make something I think is better.
Especially in the digital age, where finding information through AI or the website dedicated to this project is very easy.

I also try to make as much use as possible of text styling, using bold and italic fonts, to make parsing the effect even easier.

But the thing is, I cannot do everything I want because, for now, I'm restricted to using the Magic Set Editor software to make my cards.

### Chaining Tutors and Combo Feels

One other little problem I had was how to replicate the feeling of chaining tutors and making combos within the magic system.
The solution I found is very simple: give tutors of the archetype and many effects a free cost.
So, as I said before, I tried to balance effects that cost mana with free effects to keep the Yu‑Gi‑Oh combo feeling while still having an interactive game.

That's why in my first batch, all the effects of Burning Abyss creatures are free when sent to the grave, and all the discard effects from Necroz creatures are also free, because it's the core of their mechanics, and that's where you feel the Yu‑Gi‑Oh feeling of this project.

### One Turn Kill

Concerning the one‑turn kill problem, because Magic has summoning sickness, the issue resolves itself.

Even if I give many free effects, creatures cannot attack the turn they enter.

Also its both players that receive numerous free effects, it is not one‑sided.

Additionally, I do not plan to design or adapt many direct‑damage effects or cards with haste.

Firstly because the haste mecanic does not exist in YGO — every monster already has it.

Secondly, giving haste to too much creatures would not align with the interactive gameplay I want to create with this project.

### Match Length

On the opposite side, another possible problem is games being too long.

Because this project aims to produce highly interactive gameplay, Using Yu-Gi-Oh! cards that have many effects The magic game system naturally slows the games, which may cause the average game duration to become very long.

Even though the creatures are overstated, I can imagine scenarios where it's possible to never inflict any damage to the opponent because they keep reanimating and creating huge boards due to all the free effects I gave to the cards.

To be honest, I don't really mind if most of the game becomes the length of an entire match.
As long as the decks are consistent enough to give both players a chance to play, I am fine to play a cube where each match is just one game.
Especially in a casual context.
The main focus is that the games are interesting to play and the cube is interesting to draft.

### Lands

Another problem are the lands.

Currently, in Yu‑Gi‑Oh, many decks exceed 40 cards because the decks became so consistent and the engines are so big that you just want more space in your deck to reduce the chances of drawing bricks.

However, currently, everything I design is to be played with 40-card decks and a 10-card sideboard that contains only extra deck cards.

Even if almost every card costs one mana, the lands still take at least a third of your deck.
That means that in a 40‑card deck, you have between 13 and 14 lands to be optimal.
You may want a bit more to ensure land drops each turn and overpower your opponent with more mana, because almost every card generates some card advantage one way or another.

That means that in reality you only play with 27 or 26 actual cards in your deck.
And as I said, that's very very tight for Yu‑Gi‑Oh.

However, I know that there is the game Duel Links that makes you play with only 20-card decks, so I guess it can works.

My current solution for this problem is to restrict cards to only two copies in the structure decks and cube.

Also, another thing is that in Yu‑Gi‑Oh the concept of lands does not exist; there are no effects that could be nicely linked to lands or mana generation, because that does not exist in Yu‑Gi‑Oh.
For now, I am stuck using regular lands from Magic the Gathering for the first batches, but I would like to add new lands in the future that mesh well with archetypes.
I want to make very good lands. I’m the type of guy who hates mana flood and mana screw, so I want to create strong lands for the archetypes to mitigate those issues as much as possible.
Because the best way Magic found to mitigate the downside of lands is to give them utility effects, so that you are incited to play more lands, because you can use them if you mana flood.
That's what I will be doing in the future.

## What's planned for the Alpha 0.1 of Legend of the Alpha

OK, so now you got the overall idea.

So what is planned for the Alpha 0.1 of the first set "Legend of the Alpha" ?

I want to create two starter decks to start to playtest this project.

And I will do it with my two preferred archetypes in Yu‑Gi‑Oh.

### Starter deck one: Burning Abyss

The first one is, of course, Burning Abyss.
It was my deck when I was a competitive player, and I always loved playing all iterations of it.

As you can expect, this deck will have all the iconic cards of the archetype.
Tour Guide, Graph, Cir, Scarm, Farfa, Dante, Virgil, Rubic.
They are all here for the first Alpha of my "Legend of the Aplha" set.

I will not present every card individually, but here are the three main mechanics of the archetype.

The first is Abyssal Curse. If you control a creature that is not a Burning Abyss, all of the main deck Burning Abyss monsters will destroy themselves.

Second, is Descent. Once per turn, you can play for free one Main deck Burning Abyss creature from your hand.
I removed the restriction of spell and trap zone because that does not exist in Magic, and I added a once‑per‑turn limitation to avoid the possibility of flooding the board too much on the first turn.

And the last effect is that all Burning Abyss monsters have an on‑send‑to‑grave effect that triggers when the card is sent to the grave from any other zone.

Of course, I kept the soft and hard 1% restriction from Yu‑Gi‑Oh and formatted it as proper rule syntax, as you can see within the text in parentheses.

I will explain in more detail in the next video how to parse the effect of every card I showed here.
And if you cannot wait, you can simply go to the GitHub page of this project and ask the AI yourself or read the docs.

As you can expect, this deck focuses mostly on Xyz summoning, even though I still added Virgil, a synchro monster, because it's very easy to understand how to summon it once explained.
And it is a core card of the archetype in the Duelist Alliance era.

### Starter deck two: Nekroz

The second archetype is Nekroz.

You can expect to play Senju, Manju, Preparation of Rite, Brionac, Clausolas, Shurit, Trishula, Unicorn and more.

As I said before, all the discards effects of the archetype are free; its mostly casting creatures that costs mana, the ritual summons for example.

I kept ritual summoning exactly the same as in Yu‑Gi‑Oh, you cannot play ritual creatures from your hand paying their mana cost; you have to ritual summon them using a ritual‑summon spell.

## Why these two decks

I choose to make first Burning Abyss and Necroz because they are the two archetypes I like the most, and I really want to try them first.
The next archetypes I already planned are Shaddoll, Spellbook, and Kozmo.

If I can't make it work for my favorite archetypes, there is no point in this Essentia project.

## What I will avoid

Because I am a good game designer, there will be no floodgates or lingering effects.
So you can expect to not see Droll & Lock Bird, Abyss Dweller, Macro Cosmos or any effect of that sort.
Every card that you and I hate, I will make sure never to add them to Essentia.

## Closing

I will soon release a video for showing all the cards from the 0.1 Alpha of Legend of the Alpha Set.

Subscribe to not miss any update from the Essentia project.

I am working very hard to share my of this project.
I would love you to try it out with your friends.

You can go to this website to see all the cards, decklists, sets, new release and blog post about Essentia.
You can also easily download PDFs of proxies for every card from the website, so you can proxy decks or the cube yourself and play with your friends.

The project itself is completly open source.

IP and Copyright is evil so you can do anything you want with any of the content I shared.

You can also easily contribute if you want to : by submitting pull requests on my github project.

I built it using IA agents and IA is a first class citizens in this codebase.

So just pull up your Claude or Codex and start contributing immediately.

I also appreciate any constructive feedback or supportive comments.

And on this note, GAME ON GAMERS !

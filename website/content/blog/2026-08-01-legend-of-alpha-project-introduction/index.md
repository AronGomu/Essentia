---
title: Legend of the Alpha — project introduction
date: 2026-08-01
author: Aron Gomu
summary: The first Essentia package, what is in it, and how the cube plays.
tags: release, alpha
---

## Opening

The good old Yu-Gi-Oh!, but in Magic?

Hi everyone, and welcome to the presentation of my beloved project: Yu-Gi-Oh! × Magic: Essentia.

My goal with the Essentia project is to allow you to play Yu-Gi-Oh! cards in the Magic rule system while keeping the feeling of playing Yu-Gi-Oh!.
Hence the name: Essentia.
We keep the essence of Yu-Gi-Oh! in another game system.

This idea started from me trying to create a Magic cube using Yu‑Gi‑Oh! mechanics and cards.

It was a classical Magic cube trying to implement the Fusion mechanics from Yu‑Gi‑Oh!, mixing Magic cards that synergized well with the Fusion mechanic and new Yu‑Gi‑Oh! cards that I translated to support it.

As most first tries, it was not a great success, but it inspired me to make it better.

The thing I missed the most from that prototype was that I was not really feeling the Yu‑Gi‑Oh! feeling when playing.

I thought a lot about it, and the result is this project: trying, with that goal in mind, to replicate as much as possible the feeling of playing Yu‑Gi‑Oh! using the Magic: The Gathering rule system.

This project became very complex because I faced one major problem: the complexity for a first-time player of my cube.

Because I try to implement Yu‑Gi‑Oh! mechanics and Yu‑Gi‑Oh! archetypes, I faced the same exact horizontal complexity problem, where you need to know almost every card to determine which cards are valuable and which are not.

The only solution I found, that is not really a solution, was creating structure decks I can give to new players so they can play a few games before the actual cube and familiarize themselves with at least one or two archetypes and how the games play.

So my current goal is to make six structure decks for six archetypes, each containing 50 cards — 40 in the main deck and a 10-card sideboard.

If you remove the basics from those decks and add an arbitrary amount of cards, it should make a playable cube for at least six players.

That is my target for my first set, Legend of the Alpha.

## Who I am

But first, who am I?

I started my TCG career as a Yu‑Gi‑Oh! player very early.

I started going to weekly local tournaments around the Synchro releases, when I was around 10 years old.

As most kids do, I played on and off — not very seriously, just a kid with a kid's budget decks — up until the HAT format.

That's where I started to become much more serious about the game. I was a very active participant in the French forum OTK Expert, and I started to play a lot online, especially on Dueling Network.

Maybe you know Duelingbook, a current platform where you play Yu‑Gi‑Oh! in a browser against other players. Well, Duelingbook was its predecessor.

A few years after Duelist Alliance was released, I became a Burning Abyss budget player, and the two years of Burning Abyss, Shaddoll, and Nekroz formats were my own personal golden age of playing the game.
I became one of the best players in my local area, and I attained the top 100 on Dueling Network, which was not a small feat.

I truly loved playing Burning Abyss, Nekroz, Shaddoll, and Spellbook. Those are my four favorite archetypes of all time. Kozmo is a close fifth.

I did not like the direction Yu‑Gi‑Oh! took, going toward big first-turn combos that break the board — I don't find those kinds of games interesting at all. It strayed a lot from Shaddoll, Burning Abyss, and Nekroz, which had very interesting and interactive games most of the time.

I still came back from time to time for Tier 0 formats like Zoodiac and Tearlaments, just to experience the thing. I still follow Yu‑Gi‑Oh! content, but I am not invested in the game at all now. I am what you would call a Yu‑Gi‑Oh! boomer.

As you guessed, I transitioned to Magic during its golden era: the 2016 Modern format.

I started playing Jeskai Control and Death's Shadow in that pure goaded format, and I became a serious competitive Magic player — until FIRE design ruined everything.

Now, when I play a card game, it's mostly Legacy, which is funny, because it's the closest format to Yu‑Gi‑Oh! that you can actually play in Magic.

## Why I am making this

Ever since I transitioned into Magic, I always missed the high power and interaction of Yu‑Gi‑Oh! games. As I said, the Legacy format is the closest, but it's still not the same.

I am the type of guy who loves searching five times in my library, ritual-summoning a Valkyrus, and sacrificing my Manju and my Valkyrus just to make a plus-one using the exiling Nekroz ritual spell. You just can't do that in Magic.

I also love the Magic rule system and lands.

I want to give a good try at mixing both the feeling of power and velocity from Yu‑Gi‑Oh! with the mana system from Magic: The Gathering. Maybe the mana system is the one missing thing that allows us to play actual games of Yu‑Gi‑Oh! that don't always devolve into a board-breaking first-turn combo.

## Core idea

What's the core idea?

The foundation is Magic. Cards use Magic's rules engine, mana system, colors, stack, combat, and card super and sub types.

But the design and power level target is not normal Magic Limited or Constructed. This is aimed to be played in a closed environment, balanced against itself. The cards I show you are completely out of the norm for Magic. In my environment, having a 4/3 for one mana that can also be played for free, and that reanimates another creature when it is sent to the graveyard from anywhere — that's the norm.

If everything is broken, then nothing is. That is kind of the vibe of Yu‑Gi‑Oh!.

Unless you give the possibility of killing your opponent in one turn, having overstatted cards and effects is not really a problem, as long as you give the opponent time to do the same thing.

Also, I still gave mana costs to the cards, and almost every mana cost is just one mana. There are many effects that are free, so I hope to strike a good balance between mana-cost and free cards, allowing the Yu‑Gi‑Oh! feeling of chaining cards together while providing enough space for several interactive turns to be played.

## Yu-Gi-Oh! specifics translated into MTG

Now let me give a list of the different Yu‑Gi‑Oh!-specific mechanics I translated into Magic: The Gathering's raw systems.

### Extra Decks

The first one is the Extra Deck, and it behaves exactly like you would expect from Yu‑Gi‑Oh!.

Fusions, Synchros, Xyz, and Links start in the sideboard, and they can be played exactly like in Yu‑Gi‑Oh!, directly from the sideboard, using their summoning mechanics. By default, summoning them — putting them into play — does not cost mana. Fusions are the only exception, because I consider playing a Fusion spell like playing a creature from your hand, and it should cost at least one mana most of the time.

One thing worth mentioning: for all of these, you have to first summon them properly before you can summon them afterward without using their summoning mechanic. And, like in Yu‑Gi‑Oh!, anything that comes from the Extra Deck returns there if it is shuffled into the deck or bounced to hand.

### Life, Power and Toughness

For the power and toughness of creatures, I used a very simple rule: a ratio based on Yu‑Gi‑Oh!, where the attack or defense is divided by life points. I tried to keep that ratio as close as possible in Magic, converting it into a power and toughness number for 20 life.

8,000 life divided by 20 is 400, so every 400 attack or defense is equivalent, in my system, to 1 power or toughness. For example, [Cir](/cards/burning-abyss-cir/) has 1,600 attack and 1,200 defense in Yu‑Gi‑Oh!. Converted to Magic ratios, that becomes a 4/3, because 4 × 400 = 1,600 and 3 × 400 = 1,200. If a card has 1,500 instead of 1,600, it becomes a 3, because I always truncate the number down.

As you can see, this is very straightforward. I don't plan to make manual changes to the stats — I want to keep as much of this system as possible, because it is much simpler, and I can adapt the actual effects I cannot translate as easily to balance the card if balance is needed.

There is just one thing that bugs me: having to truncate the stats down. It would be possible to update Magic's life total to 80 instead of 20, so I would not have to truncate the numbers for 99% of the Yu‑Gi‑Oh! cards. However, I don't want to do that right now, because it would stray further from the actual Magic rule system — and the stats would look very weird to a Magic player, since you'd have to multiply the power and toughness of every creature by 4. Cir would be a one-mana 16/12, and to me that looks weird and doesn't fit an actual Magic card's stats.

### Levels and Mana

Levels and mana were one of the hardest things to translate into Magic, because the two systems are very different. You can't translate levels directly into mana cost without breaking Magic's mana generation system. Also, in modern Yu‑Gi‑Oh!, levels are more like colors or types that let you play specific cards that synergize with them, rather than a mana cost.

So I dumbed the system down: Level 1–4 monsters cost 1 mana, Level 5–6 cost 2 mana, Level 7–9 cost 3 mana, and Level 10–12 cost 4 mana. With that system, and the speed I aim for, it basically means that every card costing more than 2 mana is not really playable for its mana cost — like in Yu‑Gi‑Oh!, where, unless a card is completely broken, you cannot sacrifice two creatures to play a Level 7 monster in modern formats.

Because of this simplification, I lose a lot of precision for Synchro, Xyz, and Ritual summoning. That's one of the trade-offs of using the Magic game system: every archetype, whatever its level, now has access to the same exact Xyz and Synchro monsters.

This is less faithful to recreating archetypes, but I think it's a fine cost to pay, because my main goal is really to keep the Yu‑Gi‑Oh! feeling when playing the game, not to do a perfect recreation of the archetypes.

### Attributes and Color

Converting Attributes into color was a big headache, for two main reasons. First, Attributes in Yu‑Gi‑Oh! are basically just another type for the cards, because there is no mana system and no deck-building restrictions based on them. Second, Yu‑Gi‑Oh! has six Attributes, but Magic has only five colors.

Five Attributes are quite easy to translate — LIGHT is white, DARK is black, FIRE is red, WATER is blue, and EARTH is green — but WIND has nowhere to go.

Also, if I want a faithful adaptation of the cards while considering color balance in my cube, this becomes quite hard to balance. And a third problem: Xyz, Synchro, Fusion, and Link summoning mechanics don't care about the color of the cards, which is very weird in a Magic context and totally breaks the color pie.

So I decided not to care about color balance in my cube, and not to care about the color pie specifics. I decided to keep the color as faithful to the Attribute as possible, and for WIND monsters, I just picked a color based on the vibe of the card.

### FLIP, Traps and face-down cards

Another mechanic specific to Yu‑Gi‑Oh! is Trap Cards, and more generally face-down cards for monsters and Spells. Magic has Morph, which is a bit similar, but still plays very differently.

I made one big change: I added a new global rule that any permanent or Trap card can now be played face down for the same mana cost. So you pay the same mana you would to play the card normally, but you can choose to play it face down. You must announce whether it's a creature, and you probably need a counter to identify the face-down card and whether it can block.

Exactly like in Yu‑Gi‑Oh!, you cannot flip the card the turn you played it — you need to wait until the next turn. For creatures, you cannot flip them at instant speed; you have to wait for your turn, at sorcery speed. But Traps — a new supertype that are instants you must play face down before you can activate — can be activated at any time.

And exactly like in Yu‑Gi‑Oh!, flipping a FLIP monster triggers its effect, and there are effects that can turn cards face up or face down, with the possibility of triggering the effect again. I am currently working on the Shadow archetype, which is in part based on that mechanic — that will come in the next batch.

## Problems and how I solved them

Those were the main translations from Yu‑Gi‑Oh! to Magic I had to make. New problems appeared that I needed to solve, so here they are.

### Yu-Gi-Oh! card effect text purge

The first problem was the size of the text box, going from Yu‑Gi‑Oh! to Magic. Yu‑Gi‑Oh! is known for its terrible text-box management, cramming as much text as possible into a tiny box, and I wanted to avoid that and keep my cards' text boxes as clean as possible.

However, one good thing from Yu‑Gi‑Oh! is the PSCT syntax for card effects, which makes conditions, costs, and effect resolution very easy to understand once you know it. Basically: the first part of the effect is always the condition, if there is one, separated by a colon; then the cost, separated by a semicolon; then the actual resolution of the effect.

So I took that from Yu‑Gi‑Oh!, then took the keywords from Magic. As you can see on the cards, I make heavy use of keywords, and I created a bunch of new ones to compactify the text and make it more readable. The cost is that a new player has to check the website or the rules text to know what a keyword means — but once you've learned the keywords, it becomes very easy and fast to parse any card's effect. That's also why my cards don't read like Magic cards; I took the liberty to make something I think is better, especially in the digital age, where finding information through AI or this project's website is very easy.

I also make use of text styling — bold and italics — to make parsing an effect even easier.

The one constraint I can't get around is that, for now, I'm restricted to using the Magic Set Editor software to make the cards.

### Chaining tutors and combo feels

Another problem was how to replicate the feeling of chaining tutors and making combos within the Magic system. The solution I found is simple: give tutors of the archetype, and many effects, a free cost. As I said, I balance effects that cost mana with free effects to keep the Yu‑Gi‑Oh! combo feeling while still having an interactive game.

That's why, in my first batch, all the effects of Burning Abyss creatures are free when sent to the grave, and all the discard effects from Nekroz creatures are also free — it's the core of their mechanics, and it's where you really feel the Yu‑Gi‑Oh! feeling of this project.

### One-turn kill

Concerning the one-turn-kill problem, because Magic has summoning sickness, the issue mostly resolves itself. Even with many free effects, creatures cannot attack the turn they enter. Both players also receive numerous free effects, so it isn't one-sided. Additionally, I do not plan to design or adapt many direct-damage effects or cards with haste — first, because haste doesn't exist as a concept in Yu‑Gi‑Oh! (every monster already has it); second, because giving haste to too many creatures would not align with the interactive gameplay I want.

### Match length

On the opposite side, another possible problem is games being too long. Because this project aims for highly interactive gameplay using Yu‑Gi‑Oh! cards with many effects, the Magic game system naturally slows games down, which may make the average game duration very long.

Even though creatures are overstatted, I can imagine scenarios where it's possible to never deal any damage because players keep reanimating and building huge boards from all the free effects. Honestly, I don't mind if most games take an entire match to resolve. As long as decks are consistent enough to give both players a chance to play, I'm fine with a cube where each match is just one game — especially in a casual context. The main focus is that games are interesting to play and the cube is interesting to draft.

### Lands

Another problem is lands. Currently in Yu‑Gi‑Oh!, many decks exceed 40 cards because decks became so consistent and engines so big that players want more room to reduce the chances of drawing bricks. However, everything I design is built for 40-card decks with a 10-card sideboard containing only Extra Deck cards.

Even though almost every card costs one mana, lands still take up at least a third of your deck — in a 40-card deck, that's 13 to 14 lands to be optimal, maybe a bit more to ensure land drops each turn, since almost every card generates some card advantage one way or another. That means, in reality, you only play with 26 or 27 actual cards, which is very tight for Yu‑Gi‑Oh! — though the game Duel Links makes you play with only 20-card decks, so I guess it can work.

My current solution is to restrict cards to only two copies in the structure decks and cube.

Also, the concept of lands doesn't exist in Yu‑Gi‑Oh!, so there are no effects naturally linked to lands or mana generation. For now, I'm stuck using regular Magic lands for the first batches, but I would like to add new lands in the future that mesh well with archetypes. I want to make very good lands — I'm the type of guy who hates mana flood and mana screw, so I want to create strong lands that mitigate those issues as much as possible, the way Magic mitigates the downside of lands by giving them utility effects so you're incentivized to play more of them even when you flood. That's what I'll be doing in the future.

## What's planned for the Alpha 0.1 of Legend of the Alpha

So, now you have the overall idea. What is planned for the Alpha 0.1 of the first set, Legend of the Alpha?

I want to create two starter decks to start playtesting this project, with my two preferred Yu‑Gi‑Oh! archetypes.

### Starter deck one: Burning Abyss

The first is, of course, Burning Abyss. It was my deck when I was a competitive player, and I always loved playing every iteration of it.

As you'd expect, this deck has all the iconic cards of the archetype: [Tour Guide from the Underworld](/cards/tour-guide-from-the-underworld/), [Graff](/cards/burning-abyss-graff/), [Cir](/cards/burning-abyss-cir/), [Scarm](/cards/burning-abyss-scarm/), [Farfa](/cards/burning-abyss-farfa/), [Dante](/cards/burning-abyss-dante/), [Virgil](/cards/burning-abyss-virgil/), and [Rubic](/cards/burning-abyss-rubic/) are all here for the first Alpha of Legend of the Alpha.

I won't present every card individually, but here are the archetype's three main mechanics.

The first is Abyssal Curse: if you control a creature that is not a Burning Abyss creature, all your main-deck Burning Abyss monsters destroy themselves.

Second is Descent: once per turn, you can play a main-deck Burning Abyss creature from your hand for free. I removed the Spell & Trap Zone restriction, since that zone doesn't exist in Magic, and added a once-per-turn limit to avoid flooding the board too much on the first turn.

The last effect is that every Burning Abyss monster has an on-send-to-grave effect that triggers when it's sent to the grave from any zone.

I kept the soft and hard one-per-turn restrictions from Yu‑Gi‑Oh! and formatted them as proper rules syntax, in parentheses in the card text.

This deck focuses mostly on Xyz summoning, though I still added Virgil, a Synchro monster, because it's easy to understand once explained, and it's a core card of the archetype in the Duelist Alliance era.

### Starter deck two: Nekroz

The second archetype is Nekroz. You can expect to play [Senju](/cards/senju-of-the-thousand-hands/), [Manju](/cards/manju-of-the-ten-thousand-hands/), [Preparation of Rites](/cards/preparation-of-rites/), [Brionac](/cards/nekroz-brionac/), [Clausolas](/cards/nekroz-clausolas/), [Shurit](/cards/nekroz-shurit/), [Trishula](/cards/nekroz-trishula/), [Unicore](/cards/nekroz-unicore/), and more.

As I said, all the discard effects of the archetype are free — mostly it's casting the Ritual creatures that costs mana. I kept Ritual summoning exactly the same as in Yu‑Gi‑Oh!: you cannot play Ritual creatures from your hand by paying their mana cost, you have to Ritual Summon them using a Ritual Summon spell.

## Why these two decks

I chose Burning Abyss and Nekroz first because they are the two archetypes I like the most, and I really wanted to try them first. The next archetypes I already have planned are Shaddoll, Spellbook, and Kozmo.

If I can't make it work for my favorite archetypes, there's no point in this Essentia project.

## What I will avoid

Because I try to be a good game designer, there will be no floodgates or lingering effects. So you can expect to not see anything like Droll & Lock Bird, Abyss Dweller, or Macro Cosmos. Every card that you and I hate, I'll make sure never to add to Essentia.

## Closing

I'll soon release a video showing every card from the 0.1 Alpha of Legend of the Alpha.

Subscribe so you don't miss an update from the Essentia project.

I'm working very hard to share this project, and I'd love for you to try it out with your friends.

You can come to this website to see all the cards, decklists, sets, new releases, and blog posts about Essentia. You can also easily download PDFs of proxies for every card from the website, so you can proxy decks — or the whole cube — and play with your friends.

The project itself is completely open source. IP and copyright is evil, so you can do anything you want with any of the content I share. You can also easily contribute by submitting pull requests on the GitHub project.

I built it using AI agents, and AI is a first-class citizen in this codebase — so pull up your Claude or Codex and start contributing immediately.

I also appreciate any constructive feedback or supportive comments.

And on that note: game on, gamers!

---
title: LotA alpha v0.1 Presentation
date: 2026-08-08
author: Aron Gomu
summary: Presentation the alpha v0.1 of the first set Legend of the Alpha (LotA).
tags: release, alpha
---

## Decklists (LotA Alpha 0.1)

Playtest pair for this batch. Format matches MTGGoldfish condensed export: quantity, then name. Main 40 + sideboard 10; flex lines are optional swaps, not a third zone. Full rules copy lives in [Legend of the Alpha decklists](/docs/rules/decklists-alpha-0-1/).

### Burning Abyss

```decklist
2 Burning Abyss - Graff
2 Burning Abyss - Cir
2 Burning Abyss - Scarm
2 Tour Guide From the Underworld
2 Burning Abyss - Farfa
2 Burning Abyss - Rubic
2 Burning Abyss - Calcab
2 Burning Abyss - Alich
2 Burning Abyss - Barbar
2 Foolish Burial
2 Burning Abyss - Traveler
2 Burning Abyss - Fire Lake
2 Karma Cut
14 Swamp

Sideboard
2 Burning Abyss - Dante
2 Burning Abyss - Virgil
1 Downerd Magician
1 Daigusto Emeral
1 Stealth Kragen
1 Leviair the Sea Dragon
1 Tornado Dragon
1 Gagaga Cowboy

Flex
1 D.D. Crow
1 Effect Veiler
1 Maxx “C”
1 Ash Blossom & Joyous Spring
1 Dark Hole
```

### Nekroz

```decklist
2 Manju of the Ten Thousand Hands
2 Senju of the Thousand Hands
2 Preparation of Rites
2 Nekroz - Brionac
2 Nekroz - Clausolas
2 Nekroz - Unicore
2 Nekroz - Shurit
2 Nekroz - Dance Princess
2 Nekroz - Trishula
2 Nekroz - Valkyrus
2 Nekroz - Mirror
2 Nekroz - Cycle
2 Nekroz - Kaleidoscope
14 Island

Sideboard
2 Herald of the Arc Light
1 Daigusto Emeral
1 Stealth Kragen
1 Leviair the Sea Dragon
1 Tornado Dragon
1 Gagaga Cowboy
1 Bagooska
1 Evilswarm Exciton Knight
1 Silent Honor ARK

Flex
1 Nekroz - Catastor
1 Nekroz - Great Sorcerer
1 Nekroz - Gungnir
1 Nekroz - Decisive Armor
1 Nekroz - Exa
```

## Opening

Hi everyone !

The first alpha of my first set _Legend of the Alpha_ has officially been released !

This is the first ever batch of cards released for the Essentia project !

But just before I present you all the cards that I released — and trust me... there are a lot of them — let me explain how I test and release all the cards.

## Testing and Release system

For every single batch of cards, there are four steps that I follow before officially releasing the cards.

The first step is the drafting phase, where I just get the ideas and draft some cards.
Those are all cards that are present in my project codebase but not yet released onto the website.

Then, when I want to build a set, I don't do all the cards at once, but I do it by batches.

And for each batch, there are two steps before the official release: the alpha and the beta.
For the alpha and the beta, I lock in the selected cards so I can print and proxy them into decks to playtest with my friends.
I do a first iteration with the alpha, then I make the updates for the beta, playtest again for the beta, and finally update the cards of the set before releasing them.

Even though all the cards are in alpha and beta, I still want to keep a history of them so I can track all the changes I made for the cards.
By publishing the alpha and beta cards as I do now, this allows anyone to access them, playtest, and give feedback.
So right now, if you want, you can go directly to the website, open this blog article, and download either the decklist or the whole sheet of cards to playtest with me the first ever alpha of this project.
Just so you know, everything is completely open source. You can access the whole codebase of this project, and everything is documented on my website.
You can even create your own decklist and print it, and no mail or login is required for anything.

So now that you know the process, let's go into the archetypes.

## Archetypes

My first set of this project is named _Legend of the alpha_ (this is the fusion of Legend of the Blue Eye Yugioh set and the Alpha set from Magic which are both the first set released for their respective game).
Its short code name is LotA.
And in this set, there are five archetypes I want to include :

- Kozmo
- Spellbook
- Shaddoll
- Nekroz
- Burning Abyss

For the first iteration of the cube, I want to include six archetypes, so there is still one missing, and I don't know what to put yet.
I will see that later.

And the first batch includes Burning Abyss and Nekroz archetypes.

### Burning Abyss

The first archetype is the Burning Abyss archetype.

The gimmick of Burning Abyss in Yu-Gi-Oh! is that :

- All the Burning Abyss main‑deck monsters have as their first effect a passive that destroys them if they see another monster on the field that is not a Burning Abyss monster.
- If you control no Spell or Trap on the field, you can directly Special Summon them from your hand.
- And every single Burning Abyss monster, if it is sent to the Graveyard from anywhere, it triggers an effect. For example, from the first three Burning Abyss monsters ever released, Graff allow you to special summon another Burning Abyss monster from the deck, Cir allowed you to special summon another Burning Abyss monster from the graveyard, and Scarm can search at the end of the turn for a Burning Abyss monster.
  The second and third effects are tied, which means that if you use the special summon this turn, all copies of the same Burning Abyss monster cannot trigger their graveyard effect.

In Yu‑Gi‑Oh, there were different versions of the way this deck was played.
At first, it was very heavy on trap cards, and it was essentially a grindy deck.
Using Graff, Cir, Scarm and Dante to generate a lot of value while you interact mostly with your trap cards to deny your opponents.

Then, many more Burning Abyss monsters were released, giving you enough density to play a swarmy deck that spams Burning Abyss monsters onto the field, allowing you to OTK your opponent.
The deck stopped playing any trap cards. Especially with the release of Beatrice, it became a turbo value/OTK machine, using mostly the effect of Burning Abyss monsters to interact with your opponent.

In Magic, this deck translate perfectly into an aristocrat strategy where you generate a lot of value by sending the Burning Abyss creatures into the graveyard.
In reality, it's a bit of a mix of dredge and aristocrat sacrifice strategies.

The main difference between Yu‑Gi‑Oh! and Magic is that Magic has many more effects and win conditions that do not require you to attack with your creatures, whereas in Yu‑Gi‑Oh! almost every version of Burning Abyss must directly attack the opponent to inflict lethal damage.
Even though, to be fair, I had a bunch of little with Barbar.

My goal was to really replicate that swarmy, midrange, valuey feeling of playing that deck in Yu‑Gi‑Oh.

And to be fair, I almost changed nothing from the effects of Yu‑Gi‑Oh.

Because the first two effects are always the same, I attributed them keywords.

First, you have Abyssal Curse. This is word-for-word the same passive as in Yu‑Gi‑Oh.

Second, you have descent. And this is the only real change I made to their original effect.
Because there is no spell and trap zone in Magic: The Gathering, I created a global ability so that once per turn you can cast for free one of your Burning Abyss creatures from your hand.
Also, because of the hard‑linked restriction, you cannot trigger the graveyard effect of that creature on the same turn. Exactly like Yu‑Gi‑Oh.
I hope that it allows you to still feel the swarmy feeling of Burning Abyss while retaining a bit of control, without allowing the player to empty their entire hand on the first turn, to keep a normal pace of a Magic: The Gathering game.

And the third ability does not need a special keyword, because it's already the global keyword "On Send Grave" that I added.
And it works exactly like Yu‑Gi‑Oh. In the parentheses, the "hard" means that you can only use this effect once for all copies of all the cards with the same name this turn.

In Yu‑Gi‑Oh, the extra‑deck creatures Dante and Virgil for this first batch do not have the first two keywords, but they both have the same on‑send grave effect.

So now, let's review all the cards of this archetype.
Don't be surprised by the mana cost, power, and toughness.
Almost every card in this project costs one mana, and the power and toughness are based on the attack‑defense divided by life ratio from Yu‑Gi‑Oh.
So compared to Magic, every card here is completely broken.
But this is aimed to be played in a contained environment, so that's okay.

I will not repeat myself for every card, so here is some global information.

This frame of the Magic 7.5 Edition is used to represent every single main‑deck card.
For every normal monster, effect monster, spell, and trap, I use this frame to identify them easily.

You will see that every main‑deck Burning Abyss monster, will have this exact frame and the first two abilities: Abyssal Curse and Descent.
They also all cost only one black mana.

Alich is a 3/1 and when it is sent to the graveyard, you can target a creature on the field; that creature loses all its abilities and becomes a 0/1 until end of turn.

Barbar is a 4/2, and when it is sent to the graveyard, you can exile from your graveyard zero to three Burning Abyss cards, and for each card you exile, you inflict one damage to each opponent.

Calcab is a free one, and when sent to the graveyard, you can target one non‑land permanent and bounce it to the hand.
Outside of Graff, Cir, and Scarm, I think it's probably the strongest effect when sent to the graveyard for a main‑deck Burning Abyss creature.
I will highly monitor this card when playtesting.
But I am fine with different cards becoming better or worse in my Essentia version of the game.
I just don't want it to be broken.

Cir is a 4/3, and when it is sent to the graveyard, you can reanimate one Burning Abyss creature that is not Cir.
Because even if it's a hard once per turn, I want to avoid an infinite loop with Cir reanimating Cir.
Also, as you can see, I created and am using the reanimate keyword.
It just means putting a permanent into play from the graveyard.

Draghig is a 2/2, and when sent to the graveyard, you can discard one card from your hand, then draw one card.

Farfa 2/4, when sent to the grave, you can slow‑blink any creature on the field. Slow‑blink means that the creature is exiled until the end of the turn.
It's basically the same thing as Flickerwisp or Felidar in Magic.
I just gave it a keyword.

Graph is a 2/3, and when sent to the graveyard, you can summon one Burning Abyss creature from your deck that is not Graph.
By summon, summon is a keyword that just means putting a permanent into play from a specified location.
In this case, the location is the deck, so you put from the deck one Burning Abyss creature that is not Graf.

Rubic is a bit of a special case for main‑deck Burning Abyss monsters because it is the only monster that does not have any graveyard effect.
Instead, it is a tuner that can only be used to synchro summon a Burning Abyss synchro monster, and the only Burning Abyss synchro monster that exists is Virgil.
This is basically the intended and almost only way to properly synchro summon Virgil in Yu‑Gi‑Oh and in Essentia.

And for the last main‑deck Burning Abyss creature, we have Scarm, which is a 2/5, and when sent to the graveyard at the end step, you can search one Burning Abyss creature that is not a Scarm.

For the extra deck creatures, the first one already mentioned is Virgil.
This is a one‑colorless, one‑white. This is a two‑mana, one‑colorless, one‑white synchro creature.
It requires one Burning Abyss tuner and one or more Burning Abyss non‑tuner to synchro summon him.
This is a 6/2 with two abilities. The first one can be activated at any time you could cast a sorcery.
Once per turn. You may discard one card from your hand, target one nonland permanent, and shuffle it into its owner's deck.
And the second ability is, when sent to grave, you draw one card.
To be fair, the mana cost is not really important for synchro creatures.
Even if Virgil is a white creature, there is no color restriction to synchro summoning him.
All you care about is the total mana value.
For Virgil, his mana value is 2, so the easiest way to synchro summon him is to use one Rubic, which is mana value 1, and one another Burning Abyss monster, which is also mana value 1.
1 plus 1 equals 2, so it fulfills the synchro cost, and all you have to do is send Rubic and the other Burning Abyss creature into the graveyard to synchro summon Virgil.
As you can expect, if you did not already activate the abilities of the other Burning Abyss creatures sent to the graveyard, you can activate its effect.
So now you know how to synchro summon Virgil.
As I said in the previous video, all Synchro, Fusion, Xyz, and Link creatures must start in the sideboard and cannot be bounced to the hand or shuffled into the deck; they always return to the sideboard, exactly like in Yu‑Gi‑Oh.
And also, once you have properly synchro summoned Virgil, you can then reanimate him with Cir without issue.

The second creature from the extra deck is the iconic Dante.
Dante is one white mana Xyz is a creature.
He is a 2/6 with two abilities.
The first one: you can activate it once per turn when it is on the field. Detach one material from Dante and mill up to 4 cards. Detaching and milling is the cost, and for each card you mill, Dante gains one power and vigilance until the end of the turn.
The second effect, when Dante is sent to the graveyard, lets you salvage one other Burning Abyss card from your graveyard; it's not only a creature, it's any Burning Abyss card.
And "Salvage" is a keyword I created that simply says returning a card from your graveyard to your hand.
I wanted to use the keyword Recycle at first, but it was already a used keyword in Magic: The Gathering.
As you see, I tried to replicate as best as possible the original text of Dante.
I think Vigilance is the closest thing to changing the attack position to defense position from the original Yu‑Gi‑Oh effect.
Dante is an Xyz creature, and the Xyz mechanic works exactly like in Yu‑Gi‑Oh.
To Xyz‑summon Dante from your sideboard, because Dante is mana value 1, you must override two mana‑value‑1 creatures that are face‑up on your field.
Xyz‑summon Dante then attach the two creatures as material to Dante.
There is not a single window of priority for any player for this whole process.
One importnant thing si that the two creatures that became materials are not sent to the graveyard, however, if you detach an Xyz material, it will trigger its on‑sent‑to‑grave effect.
Also, if the XYZ creature is destroyed, sent to the graveyard, exiled, or shuffled back into the sideboard, the materials will still go to the graveyard and trigger the on‑send grave effects.
Exactly like in Yu‑Gi‑Oh, you can use one of the creatures you summoned with the descent ability as material and wait until the next turn to detach it, so you can still get the on‑send grave effect.
This is the main advantage of Xyz compared to Synchros, because to Synchro Summon Virgil, you must immediately send the two face-up creatures used for the Synchro Summon.
Also, to be precise, for Xyz, Synchro, and Link summoning, the creatures on the field must be face-up.
You cannot use face-down creatures.

That was all the Burning Abyss creatures, but there are still two non-creature left.

The first one is Burning Abyss Traveler, a one‑black mana trap that says, when it resolves, you may choose any number of Burning Abyss creatures that were sent to the graveyard this turn and reanimate them.
So the first thing is that this is a trap.
All traps are instant that you have to set them face down first.
You cannot cast them directly from your hand.
The set face-down mechanic is a specific mechanic from Essentia.
Every card can be played face-down.
Setting a card does not go onto the stack, exactly like Morph.
Exactly like Yu‑Gi‑Oh, you have to wait until the next turn to activate and play the card.
And you can only flip and activate face-down cards at instant speed if they are instants.
Otherwise, for a creature, for example, you have to wait until your next turn to flip it at sorcery speed.
The trap supertype specify that the card cannot be played from your hand and must be set face down first.
The second thing is that Burning Abyss Traveler does not target. You choose the creature you reanimate at the resolution of the effect.
But to be fair, it does not really matter because you will probably always try to reanimate every single Burning Abyss sent to the graveyard.

The second one is Burning Abyss: Fire Lake.
This is a single black mana trap instant.
By sacrificing two Burning Abyss creatures from your field, you can target up to three nonland permanents and destroy them.
Just to make it clear, sacrificing and targeting are the cost of the card.
Everything that is before the semicolon is part of the cost.

And now you have seen every single Burning Abyss card for the Alpha version 0.1 of the Legend of the Alpha set.

But stay tuned, because there are non‑archetype cards that are included at the end of the video, and some are specific to Burning Abyss.

### Nekroz

The second archetype is Nekroz.

The entire Nekroz archetype is based around Ritual Summons, Ritual Creatures, and Ritual Summons.

Ritual Summon. Ritual Summoning is a mechanic specific to Yu‑Gi‑Oh that I translated into Magic.
A ritual creature cannot be normally cast from your hand like any other main‑deck creature.
Instead, you have to ritual summon them using a ritual summon effect.
The vast majority of the ritual summon effects are sorceries, and they require a ritual tribute to perform the ritual summon.
By default, the ritual effect ritual‑summon a creature from your hand by sacrificing creatures from your hand or your field that match the mana value of the ritual creature.
To match it, you add the mana value of all the sacrificed creatures to mett the mana value of the ritual monster.
The total sum can be higher than the mana value of the ritual creature, but it must be at least exactly equal.

In the early days of Yu‑Gi‑Oh, Ritual Summoning was kinda bad.
Ritual summoning a ritual creature requires many resources, since you must activate the ritual summon effect from your hand, which summons the ritual creature from your hand using tributes from your field or hand.
Not only do you most of the time go at least minus 2 in card advantage, but you also need to assemble all the pieces required for the ritual summon.

Nekroz was the first true Ritual archetype that made proper Ritual Summoning one of the best things to do in the metagame.

Necroz solved the ritual issues by giving you a billion tutor, almost any hand you start with can search either the missing ritual effect or ritual creature.
Every single Ritual creature can be discarded from your hand to either tutor something or apply an effect.
So even if you open with a lot of them, they are not bricks.
All the normal creatures and all the non‑ritual creatures generate value when they are sacrificed.
And the ritual spell effects are way more permissive.
One allow you to ritual summon creatures from your graveyard.
Another one allows you to exile creatures from your graveyard instead of tributing them from your hand or field.
Basically, they mitigate as much as possible all the downsides of traditional ritual summons.

So, as you will see, there are three categories of cards for the Nekros archetype.
There are the Nekroz ritual monsters that all have a discard‑from‑hand effect and an effect on the field
Non‑ritual creatures that have an effect when tributed that generates some kind of value and one another effect. .
And finally sorcery ritual summons that perform the ritual summons.
They all have the Necroz Recovery keyword ability that allows you to exile them and one another Necroz card from your graveyard to search another ritual summon sorcery.

So now that you know all the mechanics of the archetype, let's see the cards.

The first one is Necroz Brionac. Mana value 2.
I will not specify the color because all the necros creatures are blue, and also ritual summoning, by default, does not look at the color of the mana cost of the ritual creature or the tributes.
This is a 5/3 ritual creature warrior.
At any time you can play a sorcery. You can discard it from your hand to search one necroz creature in your deck and add it to your hand.
This is a hard once‑per‑turn effect, so each turn you can use only one Brionac ability.
Its second ability is an activated, sorcery‑speed, hard once‑per‑turn ability.
You can target one creature that was put onto the field from the sideboard — so only fusions, synchros, Xyzs and links creatures.
Then you shuffle it back into the sideboard because those types cannot be shuffled into the deck.
To note, unlike the Burning Abyss creatures, both of those abilities are hard once-per-turn effects, but they are not linked.
You can use them both on the same turn.
Brionac is core to the Necroz archetype.
It is the glue that holds the deck together.
There is no reason not to play the maximum amount every time.

Next one is Necroz Catastor, which is a ritual creature, machine, mana value 2, that is a 5/3.
Its first ability is a hard once‑per‑turn, and at sorcery speed you can discard it to target one necros creature in your grave and reanimate it.
Note that you cannot reanimate ritual creatures unless they were previously properly ritual summoned onto the field before being sent to the graveyard.
You cannot just discard a ritual creature and reanimate it, or mill it and reanimate it.
In Yu‑Gi‑Oh, you have to track ritual creatures that were properly summoned. You have to track them in the graveyard or exile if you want to summon them back
Its second ability is a static passive ability where all Necros creatures you control gain Ward 2.
This is the same ability as in Magic: The Gathering.
An opponent who wants to target any Necros creature you control must pay 2 mana to resolve the effect otherwise, it's countered.

Next one is Necros Clausolas. This is one mana, 3/5 warrior ritual creature.
Its first effect can only be activated at sorcery speed. You discard a clausolas to search one non‑creature ritual summon Necroz.
The only targets are the three ritual summon sorceries.
The second ability can be activated at instant speed when Close the last is on the field. You target one creature; it will lose all its abilities and become a 0/1 until the end of the turn.
Both abilities are hard once per turn.
Like Brionac, Clausolas is core to the archetype.
And you will often discard Brionac to search Clausolas, then discard Clausolas, to search a ritual summon sorcery.

Next one is Necroz Decisive Armor, which is a 3‑mana, 8/5 warrior ritual creature.
Its first ability can be activated at instant speed.
You can discard it to target one Necroz creature on the field, and that Necroz creature will gain +2/+2 until end of turn.
The second ability can be activated from the field at sorcery speed. You target one creature and it gains -2/0 until end of turn.
This is clearly not core to the archetype; it's more of a toolbox card that you play as a one‑off because you can search it easily at any time.
Both abilities are hard once per turn.

Next one is Necroz Gungnir.
It is a 3‑mana, 6/4 Dragon Ritual creature.
Its first ability can be activated at instant speed: discard Gungnir and target one Necroz creature; until end of turn that creature gains indestructible.
The second ability: when Gungnir is on the field, also at instant speed, you may discard a Necroz card from your hand and target one Necroz creature you control; that creature gains indestructible until end of turn.
Both abilities are hard once per turn.
Similar to Decisive Armor, this is also more of a toolboxy type of card.

Next one is Necroz Trishula.
It's a 3‑mana, 6/5 Dragon Ritual creature with two abilities.
The first ability: you can discard Trishula at instant speed and target a spell or ability that targets a Necros creature you control, then counter that spell or ability.
The second ability: when Trishula enters the battlefield, at resolution you can exile an opponent’s non‑land permanent, a random card from their hand, and a card from their graveyard.
You must be able to exile all three; otherwise the entire ability does not resolve.
Both abilities are hard once per turn.
In Yu‑Gi‑Oh, this was the boss monster of the archetype.
The play pattern of the Nekroz metagame completely warped around this card.
Players did their best to end their turn without a card in the hand, on the field, or in the graveyard to avoid this ability.
And I intend, in Essentia, for this card to be the main way to grind the opponent and deal with problematic permanents.
But in Magic, it's way harder to empty your hand, so discard may be completely broken.
This is one of the cards I will highly monitor in my playtesting.

Next one is Necroz Unicorn.
It's a one‑mana 5/2 Warrior Ritual creature with two abilities.
The first, at sorcery speed, lets you discard Unicorn and target one Necroz card in your graveyard, then you salvage it, returning it to your hand.
It is a hard once‑per‑turn.
The second ability is a static passive: all creatures that were put onto the field from a sideboard lose all their abilities.
This is basically the same thing as Dress Down, but only for Fusions, Synchros, Xyz et Links.
Like Brionac and Clausolas, you always play the maximum amount possible for consistency.

Next one is Necroz Valkyrus.
It's a 3‑mana, 7/4 Warrior Ritual creature with two abilities.
The first, if you control no creature, you can discard Valkyrus at instant speed and get a fog effect this turn, preventing all combat damage that would be dealt to you.
The second ability is activated from the field: you sacrifice one to two creatures from your hand or field and draw one card for each sacrificed creature.
Note that the sacrifice effect triggers the on‑sacrifice effect of the non‑ritual Necroz creatures you will see later.
Both abilities are hard once per turn.
To be honest, I fear that this card is broken because of the ability to get a fog almost every turn.
I have a hard time visualizing how the Burning Abyss deck can beat a Trishula + Valkyrus Fog every turn.
However, one big difference between Magic and Yu‑Gi‑Oh! is that if you have any creature on your side of the field, you cannot discard Valkyrus and get the fog.
Even though in Yu‑Gi‑Oh! you could still activate this card because each attack is independent.
But in this version of the game, no creatures have haste.
So this is another card I will closely monitor.

We are now done with all the ritual creatures.
Now we go to the non‑ritual creatures of the archetype.

The first one is Necroz Dance Princess.
It's a one-mana 4/2 wizard creature with three abilities.
The first one is a static ability that says the opponent cannot respond to your effect that ritual summons one Nekroz creature.
Basically, it gives any of your ritual summon sorcery a split second.
But you need to have Necroz Dance Princess face-up on the field to have this static apply.
The second one is also a static, and when Nekroz Dance Princess is face-up on the field, all your Nekroz ritual creatures gain hexproof.
The third one, and most important one, is a hard once‑per‑turn triggered ability.
When Dance Princess is sacrificed, you can target one other Necrose card from your exile and reclaim it.
Reclaim here is a keyword that means returning a card from your exile to your hand.
In Yu-Gi-Oh!, this card was usually a one‑off in the deck because the ability to retrieve cards you exile with your ritual summon sorcery is pretty good, it can almost go infinite.

Next, we have Necroz Exa.
This is a two‑mana, 5/2 dragon creature with two hard once‑per‑turn abilities.
The first ability is: When exa is sacrificed, you can search your deck for one Dragon Ritual Nekroz creature and put it into your hand.
Basically, it can search itself, Gungnir and Trishula.
The second ability, when Exa is exiled, you can target one other Necroz creature in your exile, and you can release it ignoring its summoning restrictions.
Release, here, means summoning, hence put into play from the exile.
And here I specify that you ignore the summoning restriction, so you can summon or release even ritual creatures that were not properly ritual summoned on the field before.
I don't remember this card being played much in Yu‑Gi‑Oh, but it was one of the latest releases when the archetype was already in decline.
However, it seems pretty good in Essentia.

Next, we have Necroz, Great Sorcerer.
It's a one‑mana 3/2 wizard creature with two hard once‑per‑turn abilities.
The first ability: when Great Sorcerer is sacrificed, you may search your deck for a ritual Necroz creature and put it into your hand.
The second ability: when Great Sorcerer is exiled, you may target another Necroz in your exile and return it to your hand.
I remember this card being played as a one-off in the Nekroz deck.
It was not really played much because of its level, making it hard to use for ritual summons.
However, in this version of the game, he seems way easier to use for a ritual summon and exploit both of its effects.

And the last non‑ritual creature is Nekroz Shurit.
It's a one‑mana 0/4 Warrior creature with two abilities.
The first is a static passive that says Shurit can satisfy the ritual sacrifice of a Nekroz ritual summon alone.
That basically means you can use Shurit when sacrificing it or exiling it for any cost, any tribute of a Nekroz ritual summon, and it's enough to validate the requirements.
To give an actual example, when performing a ritual summon you can only tribute Shurit to ritual summon Trishula, even though Shurit is mana value 1 and Trishula is mana value 3.
Its second ability is a hard, once‑per‑turn triggered ability. When Shurit is sacrificed, you can search for one Necroz creature from your deck to your hand.
Shurit is the glue that holds all the ritual summons together.
He makes it very easy to perform a ritual summon, as you can see.
Shurit can search Brionac and can search shurit.

Now that we are done with all the necrose creatures, let's see the three ritual summon sorceries.

The first one is Necrose Cycle.
It's a one‑blue‑mana ritual summon sorcery with a resolution effect and an activated hard once per turn ability.
When you resolve this card, you can ritual summon one Necros creature from your hand or grave by sacrificing creatures from your hand or field whose mana value meets its ritual cost.
So, as I said before, for example, if you try to ritual summon Trishula, you can tribute three mana‑value 1 creatures from your hand or field to ritual summon Trishula.
Also, as mentioned on the card, you can ritual summon one Nekroz from your hand or graveyard.
For Exemple, you can ritual summon a Brionac that you discarded to search Clausolas that you also discarded to search Necroz Cycle.
The second ability is Necroz Recovery.
As I described at the start, it is a hard once‑per‑turn activated ability that you use when Necroz Cycle is in the graveyard.
You exile Necroz Cycle and another Necroz card from your graveyard to search a non‑creature ritual‑summon Necroz card from your deck to your hand.

Next one is Necrose Kaleidoscope.
It's a one‑mana ritual summon sorcery, with also one resolution effect and the Nekroz Recovery.
On resolution, you can ritual summon one ritual creature.
You can ritual summon one ritual Necroz creature from your hand by sending one creature from your sideboard to the grave as material whose mana value alone meets its ritual cost, or by sacrificing creatures from your hand or field whose total mana value meets its ritual cost.
To simplify it, because it's hard to get it the first time, there are two ways to perform the ritual summon.
The first is to send from your sideboard one creature whose mana value is the same as the mana value of your ritual creature that you try to ritual summon.
The second is the classic ritual way where you tribute creatures from your hand or field to satisfy the requirements.

And the final and last Nekroz card is Nekroz Mirror.
Which is a one‑mana ritual‑summon sorcery with the Nekroz recovery ability and its resolution effect.
When you resolve Necros Mirror, you ritual summon one Necros creature from your hand, and you can either exile a creature from your grave or sacrifice a creature from your hand or field to satisfy the mana‑value requirement for the ritual creature.
The main difference with Necroz Kaleidoscope is that you can, at the same time, exile creatures from your graveyard and sacrifice from your hand or field to satisfy the ritual cost.
Instead of Kaleidoscope, which forces you to either send one creature from the sideboard or only use creatures from your hand or field.
And one important thing to note is that you can exile only Shurit, and it will satisfy the ritual cost.
So you can play Nekroz Mirror and ritual summon one Nekroz Trishula from your hand by exiling just one Shurit from your graveyard.

For Burning Abyss, there are still non‑archetype‑specific cards that are dedicated to this archetype for this first batch.

### Non Archetypes

Now that we have reviewed all the Burning Abyss and Nekroz cards, let's review all the non‑archetype cards released for version 0.1 of the Alpha of Legend of the Alpha.

The first one is Ash Blossom and Joyous Spring, which is a one‑red‑mana 0/4 Zombie tuner creature with a hard once‑per‑turn activated instant ability.
At instant speed, you can discard Ash Blossom from your hand and target a spell or ability whose effect interacts with the deck and counter it.
Any effect that interacts with the deck—when the opponent’s effect mentions a draw, drawing from the deck, searching the deck, milling, or sending cards from the deck to the graveyard—counts.
If you are a Yu‑Gi‑Oh! player, you know this card for sure.
In this first batch, you can use this card to counter Brionac, Shurit, or Scarm search effects, or Graph deck summon effect.
It's also a tuner, so that may be useful.
And even if the card costs one red mana, we mostly play it for this card's effect, so you don't really care about it.

The next one is Baguska, which is one green mana, 5/5, and finds Xyz creatures.
It's an Xyz creature that requires two mana‑value‑1 face‑up creatures as material for its Xyz summon requirements.
It has three abilities.
The first is a triggered ability: at the start of your upkeep you must detach one material from Baguska, and if you can't, you destroy it.
The second ability is static: as long as Baguska is untapped, opponent's creatures cannot attack.
The third ability is also static: as long as Baguska is tapped, all other creatures on the field lose all their abilities.
I tried to translate the effect of the Yu‑Gi‑Oh version of Baguska into Magic.
We will see if it's too strong.

Next one is Book of Moon, which is a blue mana instant with an alternative cost.
If you control no creature, you may cast Book of Moon from your hand for free, and at resolution you target one creature and turn it face down.
The main difference with Yu‑Gi‑Oh is that I gave Book of Moon a mana cost and an alternative cost, because you will never pay one blue mana to use the card.
However, I did not want to create a zero‑mana instant that can be played in every deck.
I still want to keep the use of color from Magic.
I also like the fact that if you control no creature, you may cast it for free, making it more of a comeback effect.
But to be fair, I think this card absolutely sucks and will never be played by anyone.
But we will see in the playtest.

Next one is Diddy Crow.
For one black mana, it's a 0/4, 0/1 bird creature with an activated flash ability.
Anytime you can play an instant, you can discard Diddy Crow and target one card in any graveyard and exile it.
This is basically a bad version of Fairy Macabre, but I wanted to only use Yu‑Gi‑Oh cards for now, so that's why it's here.
But I think, because of the ruling of Magic, it's also a pretty bad card in this environment.

Next one is Daigusto Emeral, which is a 4/2 Rock Xyz creature that requires two mana‑value 1 creatures to Xyz summon it.
It has one activated “soft once per turn” ability that you can activate at sorcery speed.
Detach one material from Daigusto, target up to three creatures in your graveyard, shuffle them back into your deck, then draw one card.
This is one of the most powerful Xyz monster In Yu‑Gi‑Oh! and it will probably be the same in Essentia.
I removed the other ability because a normal creature doesn't really exist in Magic, and the effect was never used in Yu-Gi-Oh! anyway.

Next one is Dark Hole, for one black mana.
It's a sorcery that destroys all creatures.
As you can see, even though all the creatures are completely broken for the standard of Magic, the spells and interactions I translate from Yu‑Gi‑Oh into Magic are also completely broken.
This is basically a Wrath for only one mana.
In Yu‑Gi‑Oh, because almost every creature has a floating effect or generates a value of some sort, this card is probably just good but not broken.
Because, to be fair, in the Legacy format in Magic, I don't think a one-mana Wrath would destroy the format.
For example, Terminus exists, and even if it’s clearly not the same thing because Miracling still requires a bit of setup, you not only Wrath the board but you send them back to the deck.
And it's clearly not broken.
So I am not worried about it.

Next one is Downard Magician, which is for a one‑red, 5‑1 Xyz creature, wizard Xyz creature, that requires at least two mana‑value 1 creatures as material for its Xyz summon.
It also has an Xyz summon alternative cost, where you use only one already face‑up Xyz creature you control, a mana‑value 1 Xyz creature, and you use it and all its material as the materials.
For example, if you have a Dante on the field, you can simply Xyz Summon Downerd Magician and overlay it onto Dante, and you keep all the material and Dante under Downerd Magician.
The main reason for its presence here is not really its power level; it's only because I am nostalgic for the early Duelist Alliance metagame, where Burning Abyss played Downerd Magician as a play pattern to ensure that Dante cannot be exiled or shuffled back into the extra deck because he becomes a material.
And honestly, that may be useful against Necroz here.

Next one is Effect Veiler.
For one white mana, it's a 0/1 tuner wizard creature with one activated flash ability.
At ny time you can play an instant, you can discard Effect Veiler and target one creature on the field.
Until the end of the turn, that creature loses all its abilities, and if any abilities from that creature are on the stack, you counter all of them.
That's the best way I found to replicate the actual effect of Effect Veiler in Yu‑Gi‑Oh.
In Yu‑Gi‑Oh, when you activate the effect of a creature that enters the field, if you just negate its abilities on the field, the ability will still resolve because it's on the stack.
So, with this addition of countering all the abilities on the stack, it replicates the best possible way the actual effect of Effect Veiler in the game.
Also, one difference from Yu‑Gi‑Oh! is that, unlike Yu‑Gi‑Oh!, you are not restricted to play Effect Veiler only in the main phase.
Here you can play it anytime, so it's stronger in that way.
I don't know how much stronger, though.

Next one is Evil Swarm Exciton Knight.
For one white mana, it's a 4/1 XYZ creature, which XYZ summon requires two mana‑value 1 creatures.
It has one activated flash ability, soft once per turn.
If an opponent you face controls more cards than you, you may detach one material from that card and destroy all other non‑land permanents on the field.
To make it very clear, to activate this effect you must add the number of cards in your hand to the number of cards you control, and the sum must be less than the total number of cards your opponent controls on their field.
So it's really a card that is an effect that can only be used when you are way behind, especially counting the lands.

Next one is Foolish Burial.
For one black mana, it's a sorcery that simply sends one creature from your deck to the graveyard.
This is basically Entomb that can send only creatures at sorcery speed.
Nothing much more to say.
If you play Burning Abyss, you will play the maximum amount of this card possible.

Next one is Gagaga Cowboy.
For one red mana, it's a 3/6 Warrior XYZ creature that requires two mana‑value 1 creatures to perform the XYZ summon.
It has one activated sorcery‑like ability: at any time you may play a sorcery, detach one material from this card, and deal 2 damage to each opponent.
In the Yu‑Gi‑Oh counterpart, it's a very simple card with a simple effect.
It gives some reach to any decks that play a one‑mana creature, which is almost all of them.
But to be fair, now that I think about it, the Burning Abyss archetype has a lot of direct damage between Barbar and this card.

Next one is Herald of the Arclights.
It's a one‑white‑mana, 1/2 Psychic Synchro creature that requires, for its Synchro Summon, one Tuner creature and one or more non‑Tuner creatures.
So it's a hard Synchro creature to summon because it requires zero‑mana creatures that this first batch does not have.
This card exists solely for the Necros archetype because of its two abilities.
The first ability is a static passive that says every time a card would be put into the Graveyard from your hand, the field, or the deck, you exile it instead.
This is not relevant because you cannot summon this card yet.
The important ability is the second one.
It's a triggered ability: when this card is sent to the Graveyard from anywhere, you can search one Ritual creature or non‑creature Ritual Summon from your deck to your hand.
As you probably guessed, the goal of this card is to use it with Necroz Kaleidoscope, sending it from your sideboard to the graveyard to perform the ritual summon of Unicore or any other one‑mana Necroz ritual monster.
You also get to search any Necroz ritual monster or ritual‑summon sorcery.
This is a very important card for the Nekroz archetype, which is not directly part of the archetype.

Next one is Karma Cut, which is a one‑black‑mana trap instant.
At its resolution, you discard one card from your hand, target a creature on the field, and exile that creature.
This is basically a bad sword to ploucher, but sword to ploucher is pretty good, so who knows.
But the fact that you have to pay mana for this card probably dooms it to be unplayable.
So maybe I need to add an alternative mana cost, like for Book of Moon.
But as I tend to forget sometimes, I designed the cards to be in a cube, so it's fine to have less good cards as long as they have a lot of synergy with archetypes present in the cube, and here it's a pretty perfect match for the Burning Abyss archetype.

Next one is Lévière, the Sea Dragon.
For one green mana, it's a 4/4 Dragon XYZ creature.
The requirement to XYZ‑summon it is two mana‑value 1 creatures.
It has one activated sorcery‑like ability, once per turn.
At any time you can play a sorcery, detach one material from this card, and target one exiled mana‑value 1 creature; you can release it, meaning putting the exiled creature into play.
I think this card will be very good.

Next one is Manju of the Ten Thousand Hands.
For one blue mana, it's a 3/2 Fairy creature with a triggered ability.
When this card enters the battlefield, you may search for a Ritual creature or non‑creature Ritual summon from your deck to your hand.
This card basically exists only for the Necroz archetype.

Next one is Maxx C, the infamous Maxx C.
For one green mana, it’s a 1/1 insect creature with an activated flash ability that can be used once per turn.
At any time you can play an instant, you can discard Maxx C.
If a creature has already entered the battlefield under an opponent’s control this turn, you may draw a card each time an opponent’s creature enters the battlefield until end of turn.
Because special summons do not exist in Magic: The Gathering, I adapted this card to ignore the first time a creature enters the field when a creature or more has already entered, to simulate the normal summon.
And to be fair, I have no idea if this card is better or worse than the Yu‑Gi‑Oh version.
My instinct says that it's a bit worse because, even though I try to replicate the Yu‑Gi‑Oh feeling, the pace of play should be slower than Yu‑Gi‑Oh, so you will get less value from Maxx C overall.
But to be fair, in the Necroz format, Maxx C was good, but it was not completely broken.
So, we will see.

Next one is Preparation of Rites.
For one blue mana it is a sorcery, and when it resolves you can search for one ritual creature with mana value 2 or less.
Then you may salvage (meaning returning one non‑creature ritual summon from your graveyard to your hand) one non‑creature ritual summon.
For the Necroz archetype, this is basically a one‑mana double tutor and should be as broken as in Yu‑Gi‑Oh.

Next one is Senju of the Thousand Hands.
For one blue mana, this is a 3/2 fairy creature with one triggered ability.
When Senju enters the field, you can search one ritual creature from your deck and add it to your hand.
Nothing special to say, this is another dedicated card for the Necroz archetype.

Next one is Silent Honor Arc, a one‑blue‑mana 5/2 Aqua Xyz creature that requires two mana‑value 1 creatures to Xyz summon it.
It has two abilities.
The first is an activated, soft, once‑per‑turn sorcery ability: you may detach two materials from this card and target one untapped creature your opponent controls, then attach that creature to Silent Honor Arc.
This functions as removal that does not destroy or send the creature to the graveyard immediately.
The second effect is that if Silent Honor Arc would be destroyed, you can detach one material instead to prevent its destruction.
This is just a toolbox Xyz creature.
Nothing special to say.

Another toolbox Xyz creature, Stealth Kraken.
For one blue mana, this is a 4/3 Aqua Xyz creature, which requires two mana‑value 1 creatures to perform the Xyz summon.
It has two abilities.
The first is a static passive ability: as long as Stealth Kraken is on the field, all creatures are also blue in addition to their other colors, the same effect as Painter from Magic: The Gathering.
The second effect is an activated, soft‑once‑per‑turn flash effect.
At any time you can play an instant, detach one material from this card, target one blue creature, destroy it, and then deal damage to its controller equal to half its power, rounded down.

Second-last card, Tornado Dragon, for one green: it's a 5/5 Wyrm XYZ creature that requires two mana‑value 1 creatures to XYZ‑summon it.
It has one activated, soft, once‑per‑turn flash ability.
At any time you can play an instant, detach one material from this card, and target a non‑land, non‑creature permanent to destroy it.
This can target any face‑down traps, enchantment, or artifact.
This is another XYZ toolbox creature you can use, which is pretty good.

And the last card of this entire batch of 50 different cards, Tour Guide from the Underworld, is a one‑black‑mana 2/1 Fiend creature with a hard once‑per‑turn triggered ability.
When Tour Guide enters the field, you can summon a Fiend creature with mana value 1 from your hand or deck, and it loses all its abilities while on the field.
This is one of the most iconic cards of Yu‑Gi‑Oh and is completely dedicated to the Burning Abyss archetype, because the Burning Abyss creature loses all its abilities while on the field.
That negates the Abyssal Curse passive and avoids the destruction of the Burning Abyss creature.
So, for a single black mana, you can play Tour Guide, summon any Burning Abyss creature from your deck— for example, Graf— then overlay both of them into Dante.
You can detach Dante to detach Graf, mill four cards, and trigger the ability of Graf and any other Burning Abyss you milled.
This means that on the first turn you have Dante on the field and at least one other Burning Abyss summoned from your deck.
This is exactly the same play pattern from Yu‑Gi‑Oh, and honestly, Tour Guide is one of my favorite Yu‑Gi‑Oh cards.

Now that you have seen literally every card of this first batch for the Alpha 0.1 of the Legend of the Alpha set.
Let me present at last the two decklists I want to confront for the playtest.
If you want to playtest too, both of those decklists are available on the Essentia website, where you can download the PDFs to print and proxy them to play with your friends.
You can find a PDF that contains the entire sheet of the set with two copies of every card, except Silent Honor Arc, if you want to print the entire first batch at once.

## Decklists (recap)

As I said in the previous video, I playtest with a 40‑card main deck and a 10‑card sideboard, and the maximum number of copies for any card is two, and I build them like in constructed.
I have set 14 lands for both archetypes using only basic lands because both of those archetypes are monocolor.

The full condensed lists for Burning Abyss and Nekroz sit at the [top of this post](#decklists-lota-alpha-0-1).

## Conclusion

And here we are.
I shared everything I could share from this first alpha 0.1 of the Legend of the Alpha set.
I hope I got you interested in the project.
I think you probably are, since you watched this until the end.

It will probably be at least one or more months before the next video, to give me time to playtest the cards.
But I will make sure to give you feedback on this alpha and update the cards for the beta.

The best way to support this project is to share it with your friends and try it out yourself by proxying the cards.

If you don't want to miss any news about the project, subscribe to my newsletter.
Don't worry—I will not spam.
At most, you'll receive one email every two weeks.
This ensures you stay updated, because I won't have time to make a video each time.

I said at the start of the video that there are still three archetypes missing from the first patch: Shadoll, Spellbook, and Cosmo.
I still need to decide on a fixed archetype.
For the total number of cards, if I do a batch of 50 cards for the next two groups of two archetypes, that makes at least 150 cards total.
If you add the lands to the cube, that seems about right.

So you know what to expect.

And on this, game on, gamers!

Some notes: make sure to update the text of Graph, Skarm, and Seer to specify they cannot do things to themselves, and update the text of Dante to add 0‑ for the milling effect.
Update the text of Valkyries to be 1 to 2, update the text of Shurit to search one warrior Necros ritual creature, and update the text of many of the Necros cards to put Necros before creature.
Update the text of Gagaga Cowboy to only deal 2 damage instead of 3.
Update the text of Barbar to allow exiling only up to two cards, and each card exiled deals one damage.
Update the text of Dante to allow milling up to four cards.

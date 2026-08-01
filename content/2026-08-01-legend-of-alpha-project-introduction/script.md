# Legend of Alpha — Introducing Yu-Gi-Oh! × Magic

## Video goal

Introduce project at surface level: why it exists, core design choices, major differences from Magic: The Gathering, intended feeling, and two Legend of Alpha starter decks.

---

## Opening

The good old yugioh, but in Magic ?

Hi everyone and welcome on this presentation video of my beloved project : YGO X MTG: Essentia

My goal with the Essentia project is to allow to play YGO cards in the Magic rule system but with the feeling of playing YGO.

It started as the idea of making a magic cube using adapted YGO cards and it slowly evolved into making basically an entire new game derived from Magic the Gathering rules systems.

It happened because I realised it was not really possible to raw dog the cube I was making.
Because of YGO archetypes based deck construction and highly synergistic cards, understanding what you had to do in a draft at your first exposure to the cube would be too hard for players.

So I had to make structure decks for each archetype I was building that can be played against to show how to play the game in an intuitive way.
That should be the first exposure for players for the cube.

So my current goal, is to make 6 structure decks for 6 archetypes, each containing 50 cards, 40 cards main deck and 10 cards sideboard. And if you remove the basics of those decks and add some amount of cards, it should make a playable cube.

## Who I am

But first, i want to tell you more about myself.

I started my TCG career as a YGO player very early, around 2010. I started to go to weekly local tournaments at the synchro release when i was 10 years old.

Of course, I was bad. I played on and off during this synchro era.
I remember first playing horrible synchro structure deck, then a kinda zombie deck, then mixing it with lightsworn then blackwing when it has already fallen.
I was on a budget as most kids were at the time. So I had to do with what I had.

Then I started to play seriously at the end of HAT format up until the end of Kozmo format.
I was heavely invested in Dueling Network (the previous version of Dueling Book) and played a lot.
IRL, I was a budget burning abyss player for DUEA and Nekroz format and I was blessed with my deck avoiding almost all bans the entire duration of my play.

I hard stopped the game at PEPE format because I started to hate the 10 minutes combo turns into Board Breaker format.
It was not my jam at all.
I loved the game for heavely interactive format with Shaddoll, Burning Abyss and Nekroz.

I still came back from time to time for T0 format like Zoodiac and Tearlaments and I still follow YGO content form time to time but I am not invested in the game at all now.
I am what you would call, a YGO Boomer spamming the "In my times, YGO was great, we played more than 2 turns" and stuff.

As you guessed, I transitionned to Magic during the Golden Era of Magic : 2016 Modern format.

I started playing Jeskai Control and Death's Shadow into that pure goaded format and became a serious MTG player up until the banning of Oko and URO in most format.

I retranched myself into the Legacy with a local community in my city.

To be honest, I am disgusted by the directions of both YGO and MTG.
The FIRE and Commander design is horrendous.
It justs encourages non-interactive game and poison every format it touches.

And YGO never solved the combo issue, I honestly dont understand how there is still people playing the game after getting shat on by Konami for decades.
I guess they like to get raped every banlist, I dont know man

## Why I am making this

Since i transitionned inot Magic, I always missed the high power and interaction of YGO games.

Legacy format is the closest cousin but its clearly still not the same.

There is something missing and I dont really know how to describe it in 1 word.
Its all the floating effect, the insane value you make, moving pieces of card board around like making xyz (man, just overlaying cards into an xyz is so satisfying its crazy).
I feel like MTG has not enough game action in one turn and you dont move enough card board around doing cool stuff.
I am the type of guy who love search 5 times in my library, ritual summoning valkyrus and sacrificing it to leave an empty board if you remember what i am talking about.

But I also love the MTG rule system. I love the land system and the overall feeling of the game.

So i wanted to experiment with recreating that YGO feeling into the MTG game system, here we are.

## Core idea

So the foundation is Magic. Cards use Magic's rules engine, mana system, colors, stack, combat, and familiar card types.

But the design target is not normal Magic Limited or Constructed. This is a closed environment, balanced against itself.
As you saw, cards are completly out of the MTG norms.
you get to have 1 mana 3/2 that can be played for free and when it is send to the graveyard from anywhere, it reanimates another creature from the grave.
Of course, in MTG, even in Legacy, that would be completly broken.
But in my envionment, it is the norm.
That's what i mean by adapting YGO feeling into Magic.
Everything is broken, so nothing is.

However, 1 major difference with YGO, is that I still gave cost the cards.
Yes, the cost is minimal. But it is still a limitation and I hope, it allows for interactive games playing on several turns, similar to Modern.
Remember, my goal is to recreate the feeling of YGO using MTg system, not be an exact copy of YGO transposed into MTG.

## YGO specifics translated into MTG

Let me list how I translated differents stats into Magic.

### Extra Decks

I also adapted, YGO summoning mecanics to fit MTG system while retaining YGO toolbox feeling.

So, Fusions, Synchros, Xyz and Links start in the sideboard and they can be played exactly like in YGO, directly from the sideboard executing their summoning mecanics.

### Life, Power and Toughness

For the Power and Toughness, I simply calculated adapted so that each multiple of 500 ATK is equivalent to 1 power and 500 DEF is 1 toughness.

For exemple, for Cir, it was a 1600 ATK and 1200 DEF, so it becomes a 3/2 rounded down.
I did the same for all monster cards.

I thought about another solution, where I updated the MTG life points to be 80 life, so I could simple remove the 2 zeros from the ATK and DEF for each cards and it would perfectly match the ratio and precision for the translation.
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

### Traps

### FLIP and face down cards.

## Problems and how I solved them

### YGO card effect text purge

Heartstone Keyword based card templating.

Merging, MTG keywords and YGO PSCT for condensed text effect.

### Chaining Tutors and Combo Feels

Make it free

### Hand Traps Interactions

Make it free

### One Turn Kill

Printing very minimal direct damage effect.

No cards have haste for now.

Easy to create big board for both player.

Also easy to brake them.

I dont want fast games.

I dont want infinite slogs

Need to playtest to see.

### Match Length

I want to do highly interactive game that would take entire match length.

Make deck as consistent as possible. Effects are broken and you can see many cards per games.

1 Game should be enough but not go over typical match length (aim 30 to 50 minutes games).

Need playtest to see.

## Problems I did not solve yet

### Lands

Most of cards are 1 mana. How to not make lands brick games

Solution : Create custom lands cards for archetype in the future

## What's planned for the Alpha 0.1 of Legend of Alpha

### Starter deck one: Burning Abyss

### Starter deck two: Nekroz

## Why these two decks

## What I will avoid

Floodgate and Lingering effect.

No Droll and Lock Bird, no abyss dweller, no Macro Cosmos, etc...

## Closing

I will release a video for showing all the cards from the 0.1 Alpha of Legend of the Alpha Set in a few days.

Subscribe to not miss update on this project.

Like you see, I am working hard to share this project.

You can go to this website to see all the cards, decklists, sets, new release, print the cards yourself to proxy and play.

The project itself is open source.
IP and Copyright is evil so you can anything you want by with any of my content shared.

You can also easily contribute yourself if you want to by submitting pull requests.
I built it using IA agent and IA's are first class citizens.
Just pull up Claude or Codex for documentation and to start contributing.

I also appreciate any constructive feedback or supportive comments.

On this note, GAME ON GAMERS !

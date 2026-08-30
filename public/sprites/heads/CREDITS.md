# Animal photograph credits

The seven head photographs in this folder come from [Wikimedia
Commons](https://commons.wikimedia.org/). Each was cropped to a square centred on the
animal's head and resized to 256×256; no other changes were made.

Every image is public domain, CC0, or CC BY. **None is share-alike**, which was deliberate:
it keeps the licensing of this repository simple. Attribution is still required for the CC
BY ones, and is given below.

| File | Animal | Licence | Photographer | Source |
|---|---|---|---|---|
| `malayan-tiger-head.jpg` | Malayan Tiger | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Jean (Shelbyville, KY) | [Commons](https://commons.wikimedia.org/wiki/File:Malayan_Tiger_(Panthera_tigris_jacksoni)_(52325197471).jpg) |
| `lion-head.jpg` | African Lion | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Appaloosa | [Commons](https://commons.wikimedia.org/wiki/File:Panthera_leo_bleyenberghi_head_Leipzig_Zoo_2013.jpg) |
| `giant-panda-head.jpg` | Giant Panda | Public domain | Epukas | [Commons](https://commons.wikimedia.org/wiki/File:Panda_San_Diego_2006.jpg) |
| `asian-elephant-head.jpg` | Asian Elephant | Public domain | LadyofHats | [Commons](https://commons.wikimedia.org/wiki/File:Hamburg_Elephas_maximus_young.JPG) |
| `flamingo-head.jpg` | Greater Flamingo | Public domain | Arpingstone | [Commons](https://commons.wikimedia.org/wiki/File:Bristol.zoo.greater.flamingo.arp.jpg) |
| `giraffe-head.jpg` | Reticulated Giraffe | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | Derrick Coetzee (User:Dcoetzee) | [Commons](https://commons.wikimedia.org/wiki/File:Giraffa_camelopardalis_reticulata_at_Oakland_Zoo_-_close-up_on_head.jpg) |
| `pygmy-hippo-head.jpg` | Pygmy Hippopotamus | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Cliff (Arlington, VA) | [Commons](https://commons.wikimedia.org/wiki/File:Pygmy_Hippopotamus_(Hexaprotodon_liberiensis)_(2).jpg) |

The giraffe photograph is of *Giraffa camelopardalis reticulata* — the same subspecies the
exhibit describes — rather than a generic giraffe.

## Replacing one

Drop a square JPEG in here named `<exhibit-id>-head.jpg`, add a row above, and point the
exhibit's `spriteHeadAsset` at it in `src/data/mandaiData.js`. The app centre-crops the
image into a circle, so keep the head near the middle of the frame.

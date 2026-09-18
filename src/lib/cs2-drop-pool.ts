import type { ItemType } from './lootflow-types';

export interface DropPoolPreset {
  name: string;
  type: ItemType;
  marketHashName: string;
  defaultPrice: number; // in USD
  imageUrl: string;
  rarity: 'common' | 'rare' | 'special';
}

export const CS2_DROP_POOL: DropPoolPreset[] = [
  // Active Case Pool
  {
    name: 'Gallery Case',
    type: 'case',
    marketHashName: 'Gallery Case',
    defaultPrice: 1.45,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFQxnaHOJW9DuNmzwdjcwfa7Nu_TkzIHvJcl3LzFp9in3AbnqhdtazvzJteXcVA_NFmF_VS_yOi9hce-upvJn3U2uCQ8pSGKEQf_C_Y/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Kilowatt Case',
    type: 'case',
    marketHashName: 'Kilowatt Case',
    defaultPrice: 0.95,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU1nfbOIW4Wu920h4PZwvKmZeODwWgG6pdwjL-UoNmg0Vewr0dtNz3yd4eccVRtMw6GrAS7366-0ovvpZs8sSQ/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Dreams & Nightmares Case',
    type: 'case',
    marketHashName: 'Dreams & Nightmares Case',
    defaultPrice: 1.12,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFU2nfGaJG0btN2wwYHfxa-hY-uGzm4TvZYgtbuQ84mjjgfs_hVlam-mcoHEew88NQ3T_VO7xebvhsW8uJ2anHc17ik8pSGKj2p8e-E/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Revolution Case',
    type: 'case',
    marketHashName: 'Revolution Case',
    defaultPrice: 0.38,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFY5naqQIzFB4uO3lr-YlvPxPKndkW5Vv8Zy2b-W84ikiwXhqRc5YTjyJNSdcFA9NVrR-lW2krrtgcPt6Z_AmyRk6XY8pSGKq014YhA/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Recoil Case',
    type: 'case',
    marketHashName: 'Recoil Case',
    defaultPrice: 0.28,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFY1naTJImxD7dfkztafkvfzY-yGzmhUvcF33byTrdit2wXk-0dtYTz0coCVdwU2NAnY-FG6yOvu0Me0usvPyCQx6CQ8pSGK0W5n1n8/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Fracture Case',
    type: 'case',
    marketHashName: 'Fracture Case',
    defaultPrice: 0.25,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFY5naqQIzFB4uO3mIGZkPK6Ze6GlWdQ-sJ0xOzAot-jiQa2_kRla2qlINPBcQE7aQ7U_1G5xbznhMK-uZ_KyCZh7CJw5mGdwUI3PqFsmQ/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Snakebite Case',
    type: 'case',
    marketHashName: 'Snakebite Case',
    defaultPrice: 0.26,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFYwnaTJImxD7dfkz9bbkfL3Y-2ElWpTvdZw3-zEo4j23Vbj-0ptajugIdXBcARqZAvZ-AS4yOjtgsC5upTPzXJk6Sdx-z-DyP3j0q-q/360fx360f',
    rarity: 'common'
  },

  // Rare Discontinued / Special Drops
  {
    name: 'CS:GO Weapon Case',
    type: 'case',
    marketHashName: 'CS:GO Weapon Case',
    defaultPrice: 94.50,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFUuh6qJImxD7dfkz9bbkfL3Y-2ElWpTvdZw3-zEo4j23Vbj-0ptajugIdXBcARqZAvZ-AS4yOjtgsC5upTPzXJk6Sdx-z-DyP3j0q-q/360fx360f',
    rarity: 'special'
  },
  {
    name: 'Operation Bravo Case',
    type: 'case',
    marketHashName: 'Operation Bravo Case',
    defaultPrice: 42.00,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXU5A1PIYQNqhpOSV-fRPasw8rsUFJ5KBFZv668FFUuh6qJImxD7dfkz9bbkfL3Y-2ElWpTvdZw3-zEo4j23Vbj-0ptajugIdXBcARqZAvZ-AS4yOjtgsC5upTPzXJk6Sdx-z-DyP3j0q-q/360fx360f',
    rarity: 'special'
  },

  // Weapon Skins Drops
  {
    name: 'Desert Eagle | Mudder',
    type: 'weapon',
    marketHashName: 'Desert Eagle | Mudder (Field-Tested)',
    defaultPrice: 0.12,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbupIgthwczbYD9S69O7kYQKqPr1Ibndk2JL7cFOhuDG_Zi72VGyqBY6Z2vxJNCSelI2aVvV_1C7k-_tgJfuuZvOmydmuSMm53jYnBW30EtIOuBsm7XAHjO-vC7m/360fx360f',
    rarity: 'common'
  },
  {
    name: 'MP9 | Starlight Protector',
    type: 'weapon',
    marketHashName: 'MP9 | Starlight Protector (Field-Tested)',
    defaultPrice: 3.40,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou6r8FABz7P7NYjhn49K_kL-HnvD8J_WEwjsBvpco3-2Vpt2t3wCy_EdoZW_1ctTEJwRoMl-Eq1i9xey8g8W7uZTPm3Rh6SV27X7cnBexhAYMMLJe7UooRA/360fx360f',
    rarity: 'rare'
  },
  {
    name: 'P250 | Cassette',
    type: 'weapon',
    marketHashName: 'P250 | Cassette (Field-Tested)',
    defaultPrice: 0.08,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpopujwezhjxszYI2gS09-5h5S0mvLwOq7cqWdQ-sJ0xOzAot-jiQa2_kRla2qlINPBcQE7aQ7U_1G5xbznhMK-uZ_KyCZh7CJw5mGdwUI3PqFsmQ/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Dual Berettas | Colony',
    type: 'weapon',
    marketHashName: 'Dual Berettas | Colony (Field-Tested)',
    defaultPrice: 0.04,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpos7asPwJf0v33fzxQ5dG5q4iOqPr1Ibndk2JL7cFOhuDG_Zi731Dnr0BoZG76cNDBIwI-ZlDY-Qe-x-u8g5TouZvPmHcwvnMm4Xndmhezhh1NO7c-m7XAHgJb0_8t/360fx360f',
    rarity: 'common'
  },
  {
    name: 'AK-47 | Safari Mesh',
    type: 'weapon',
    marketHashName: 'AK-47 | Safari Mesh (Field-Tested)',
    defaultPrice: 0.28,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhXTCm_LLPr7Vn35cpsB0j-vD89-h2wXhqEBsZGDyJoDDcQdvYw3V_FW6k-_oh8W1uZzOnXFivyQi4nbcmheziEpFPe1sm7XAHhXUq_xO/360fx360f',
    rarity: 'common'
  },
  {
    name: 'AWP | Safari Mesh',
    type: 'weapon',
    marketHashName: 'AWP | Safari Mesh (Field-Tested)',
    defaultPrice: 0.42,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FABz7PLfYQJS5NO0m5O0m_7zO6-fzj9V650p37-S99T30QXg-kZkYWynLYbDJAJrMF-F_1m4yevoh8fvupjLnyFmuyFw4Xbcyxe21x5IcKUx0vF5g_V4/360fx360f',
    rarity: 'common'
  },

  // Graffitis & Stickers
  {
    name: 'Sealed Graffiti | Karambit (Tracer Yellow)',
    type: 'graffiti',
    marketHashName: 'Sealed Graffiti | Karambit (Tracer Yellow)',
    defaultPrice: 0.06,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXQ5BhMYY45uhpLVvPDVOEl38oIBhJ3IAFbvLOkKghu0OH3dTxD5Nmwq4GZkPfnNrfum25V4dB8xOiWp9uhjQWx_kRoNmyiJ9eSd1E6ZF_W_gO7kr_mgMS9up_Omnox7ik8pSGKRnS0Qzs/360fx360f',
    rarity: 'common'
  },
  {
    name: 'Sealed Graffiti | GGWP (Violent Violet)',
    type: 'graffiti',
    marketHashName: 'Sealed Graffiti | GGWP (Violent Violet)',
    defaultPrice: 0.04,
    imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXQ5BhMYY45uhpLVvPDVOEl38oIBhJ3IAFbvLOkKghu0OH3dTxD5Nmwq4GZkPfnNrfum25V4dB8xOiWp9uhjQWx_kRoNmyiJ9eSd1E6ZF_W_gO7kr_mgMS9up_Omnox7ik8pSGKRnS0Qzs/360fx360f',
    rarity: 'common'
  }
];

export function findDropPoolItem(name: string): DropPoolPreset | undefined {
  return CS2_DROP_POOL.find(p => p.name.toLowerCase() === name.toLowerCase() || p.marketHashName.toLowerCase() === name.toLowerCase());
}

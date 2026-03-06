import type { UIContext } from './ui-types';

// Focus on ONE subject per image for SD 1.5 quality.
// Monsters present → monster portrait on plain background.
// No monsters → simple room/environment vignette.

const MONSTER_STYLES: Record<string, string> = {
  goblin: 'small green-skinned goblin creature, pointy ears, ragged armor',
  orc: 'large muscular orc, tusks, crude iron armor',
  skeleton: 'undead skeleton warrior, glowing eyes, rusted armor',
  zombie: 'shambling undead zombie, rotting flesh, tattered clothes',
  spider: 'giant spider, multiple eyes, dark hairy legs',
  rat: 'giant rat, matted fur, red eyes, long tail',
  bat: 'giant bat, leathery wings spread wide, fangs',
  slime: 'green translucent slime creature, oozing, amorphous',
  dragon: 'fearsome dragon, scales, glowing eyes, sharp claws',
  wolf: 'dire wolf, gray fur, bared fangs, muscular',
  troll: 'large cave troll, thick skin, massive fists',
  ghost: 'translucent spectral ghost, ethereal glow, floating',
  mimic: 'treasure chest mimic, sharp teeth, tongue, wooden texture',
};

function getMonsterDescription(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, desc] of Object.entries(MONSTER_STYLES)) {
    if (lower.includes(key)) return desc;
  }
  return `fantasy monster, ${lower}`;
}

export function buildImagePrompt(context: UIContext): { positive: string; negative: string } {
  let positive: string;

  if (context.gameOver) {
    // Game over: single focused image
    positive = context.victory
      ? 'pixel art, 16-bit RPG style, golden sunlight streaming through dungeon exit, triumphant, bright'
      : 'pixel art, 16-bit RPG style, dark dungeon floor, scattered weapons, defeat, somber';
  } else if (context.monsters.length > 0) {
    // Monster portrait: one creature, no background clutter
    const monster = context.monsters[0];
    const desc = getMonsterDescription(monster.name);
    const threat = monster.hpPct < 30 ? 'wounded, battle-damaged' : '';
    positive = `pixel art, 16-bit RPG style, ${desc}, centered portrait, dark simple background, fantasy creature${threat ? ', ' + threat : ''}`;
  } else {
    // Room vignette: just the environment
    const roomName = context.room?.name.toLowerCase() || 'dungeon corridor';
    let atmosphere = 'torchlit';
    if (context.room?.isEntrance) atmosphere = 'stone archway entrance, daylight behind';
    else if (context.room?.isExit) atmosphere = 'light at the end, exit portal';

    positive = `pixel art, 16-bit RPG style, ${roomName}, ${atmosphere}, dungeon environment, no characters`;
  }

  const negative = 'text, watermark, blurry, photo, realistic, 3d render, modern, multiple subjects, cluttered, UI elements, frame, border';

  return { positive, negative };
}

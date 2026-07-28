// Main factions file - imports all faction data from individual files
import * as StingOfLolth from './factions/stingOfLolth.js'
import * as HeartOfCormyr from './factions/heartOfCormyr.js'
import * as TyrannyOfGoblins from './factions/tyrannyOfGoblins.js'
import * as CurseOfUndeath from './factions/curseOfUndeath.js'
import * as BloodOfGruumsh from './factions/bloodOfGruumsh.js'

// Faction name constants
export const Factions = {
  STING_OF_LOLTH: StingOfLolth.FACTION_NAME,
  HEART_OF_CORMYR: HeartOfCormyr.FACTION_NAME,
  TYRANNY_OF_GOBLINS: TyrannyOfGoblins.FACTION_NAME,
  CURSE_OF_UNDEATH: CurseOfUndeath.FACTION_NAME,
  BLOOD_OF_GRUUMSH: BloodOfGruumsh.FACTION_NAME,
}

// Commanders for each faction
export const commanders = {
  [Factions.STING_OF_LOLTH]: StingOfLolth.commanders,
  [Factions.HEART_OF_CORMYR]: HeartOfCormyr.commanders,
  [Factions.TYRANNY_OF_GOBLINS]: TyrannyOfGoblins.commanders,
  [Factions.CURSE_OF_UNDEATH]: CurseOfUndeath.commanders,
  [Factions.BLOOD_OF_GRUUMSH]: BloodOfGruumsh.commanders,
}

// Creatures for each faction (12 per faction)
export const sampleCreatures = {
  [Factions.STING_OF_LOLTH]: StingOfLolth.creatures,
  [Factions.HEART_OF_CORMYR]: HeartOfCormyr.creatures,
  [Factions.TYRANNY_OF_GOBLINS]: TyrannyOfGoblins.creatures,
  [Factions.CURSE_OF_UNDEATH]: CurseOfUndeath.creatures,
  [Factions.BLOOD_OF_GRUUMSH]: BloodOfGruumsh.creatures,
}

// Order cards for each faction (36 per faction)
export const sampleOrderCards = {
  [Factions.STING_OF_LOLTH]: StingOfLolth.orderCards,
  [Factions.HEART_OF_CORMYR]: HeartOfCormyr.orderCards,
  [Factions.TYRANNY_OF_GOBLINS]: TyrannyOfGoblins.orderCards,
  [Factions.CURSE_OF_UNDEATH]: CurseOfUndeath.orderCards,
  [Factions.BLOOD_OF_GRUUMSH]: BloodOfGruumsh.orderCards,
}

export default {
  Factions,
  commanders,
  sampleCreatures,
  sampleOrderCards,
}

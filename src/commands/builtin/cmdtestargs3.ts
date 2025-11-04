import ColorCodes from "/chat/colorcodes.ts";
import {
  ArgumentParser,
  ArgumentParserBuilder,
} from "/commands/argumentparser.ts";
import { Command, type CommandOptions } from "/commands/command.ts";
import type World from "/data/worlds/world.ts";
import type EntityPosition from "/datatypes/entityposition.ts";
import type Vector3 from "/datatypes/vector3.ts";
import type Entity from "/entities/entity.ts";
import type Player from "/player/player.ts";

export class CmdTestArgs3 extends Command {
  public name = "testargs3";
  public description = "Argument parser test";
  protected argumentParser: ArgumentParser<[Entity, Player, World, string]>;
  public async execute(
    player: Player,
    args: string,
  ): Promise<boolean | [boolean, string]> {
    const [success, parsed] = this.argumentParser.parse(args);
    if (!success) {
      return [false, parsed.formatted()];
    }
    player.sendMessage(
      `Parsed: ${parsed[0].name} ${parsed[1].name} ${parsed[2].name} ${
        parsed[3]
      }`,
    );
    return true;
  }
  public async help(player: Player) {
    return (
      "Argument parser test. \nUsage: " + this.argumentParser.getUsage()
    );
  }
  constructor(options: CommandOptions) {
    super(options);
    this.argumentParser = new ArgumentParserBuilder<
      [Entity, Player, World, string]
    >()
      .entity(this.serviceRegistry.assertGet("entityRegistry"))
      .player(this.serviceRegistry.assertGet("playerRegistry"))
      .world(this.serviceRegistry.assertGet("worldRegistry"))
      .restOfLine()
      .build();
  }
}

export default CmdTestArgs3;

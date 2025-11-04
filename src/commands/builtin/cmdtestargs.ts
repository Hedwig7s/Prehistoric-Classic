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

export class CmdTestArgs extends Command {
  public name = "testargs";
  public description = "Argument parser test";
  protected argumentParser: ArgumentParser<
    [
      string,
      string,
      number,
      number,
      boolean,
      number,
      number,
      number,
      string,
    ]
  >;
  public async execute(
    player: Player,
    args: string,
  ): Promise<boolean | [boolean, string]> {
    const [success, parsed] = this.argumentParser.parse(args);
    if (!success) {
      return [false, parsed.formatted()];
    }
    player.sendMessage(`Parsed: ${parsed.join(" ")}`);
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
      [
        string,
        string,
        number,
        number,
        boolean,
        number,
        number,
        number,
        string,
      ]
    >()
      .string()
      .string("named")
      .number()
      .integer()
      .boolean()
      .rangedNumber(0, 10)
      .rangedInteger(0, 10)
      .rangedNumber(0, 10, "namedRanged")
      .string("optional", true)
      .build();
  }
}

export default CmdTestArgs;

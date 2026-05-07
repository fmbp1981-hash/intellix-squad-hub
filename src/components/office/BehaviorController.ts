// BehaviorController.ts — autonomous agent state machine
import { AgentSprite, AgentBehaviorState } from "./AgentSprite";
import { ROOM_WAYPOINTS, RoomKey, IsoPoint } from "./IsoUtils";

export class BehaviorController {
  private agent: AgentSprite;
  private timer = 0;
  private afterWalk: AgentBehaviorState = "idle";
  private homeRoom: RoomKey;
  private externallyControlled = false;

  constructor(agent: AgentSprite) {
    this.agent = agent;
    this.homeRoom = agent.def.homeRoom as RoomKey;
    this.timer = 1000 + Math.random() * 4000;
  }

  start(): void {
    if (!this.externallyControlled) this.agent.setState("idle");
  }

  setExternalState(state: AgentBehaviorState | null): void {
    if (state == null) {
      this.externallyControlled = false;
      return;
    }
    this.externallyControlled = state !== "idle";
    this.agent.setState(state);
    if (state === "idle") this.timer = 5000;
  }

  update(delta: number): void {
    this.timer -= delta;

    if (this.agent.state === "walking") {
      const arrived = this.agent.stepTowardTarget(delta);
      if (arrived) {
        this.agent.setState(this.afterWalk);
        this.timer = 6000 + Math.random() * 14000;
      }
      return;
    }

    if (this.externallyControlled) return;
    if (this.timer > 0) return;

    const roll = Math.random();
    if (this.agent.state === "idle") {
      if (roll < 0.55) {
        this.agent.setState("working");
        this.timer = 8000 + Math.random() * 18000;
      } else if (roll < 0.75) {
        this.goTo("copa", "coffee");
      } else if (roll < 0.85) {
        this.goTo("wc", "bathroom");
      } else {
        this.goTo("reuniao", "meeting");
      }
    } else {
      const home = ROOM_WAYPOINTS[this.homeRoom];
      if (Math.abs(this.agent.tileX - home.tileX) > 0.5 ||
          Math.abs(this.agent.tileY - home.tileY) > 0.5) {
        this.goTo(this.homeRoom, "idle");
      } else {
        this.agent.setState("idle");
        this.timer = 6000 + Math.random() * 10000;
      }
    }
  }

  goTo(room: RoomKey, after: AgentBehaviorState): void {
    const wp: IsoPoint = ROOM_WAYPOINTS[room];
    const jittered: IsoPoint = {
      tileX: wp.tileX + (Math.random() - 0.5) * 0.6,
      tileY: wp.tileY + (Math.random() - 0.5) * 0.6,
    };
    this.afterWalk = after;
    this.agent.setMoveTarget(jittered);
  }
}

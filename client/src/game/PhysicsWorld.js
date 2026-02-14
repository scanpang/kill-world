// client/src/game/PhysicsWorld.js
import * as CANNON from 'cannon-es';
import { GAME } from '../../../shared/constants.js';

export class PhysicsWorld {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, GAME.GRAVITY, 0),
    });

    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Ground
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEulerAngles(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    this.bodies = [];
  }

  addBody(body) {
    this.world.addBody(body);
    this.bodies.push(body);
    return body;
  }

  removeBody(body) {
    this.world.removeBody(body);
    this.bodies = this.bodies.filter(b => b !== body);
  }

  createPlayerBody(position) {
    const body = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Cylinder(0.5, 0.5, 3.5, 8),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      fixedRotation: true,
      linearDamping: 0.9,
    });
    return this.addBody(body);
  }

  createStaticBox(position, size) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
      position: new CANNON.Vec3(position.x, position.y, position.z),
    });
    return this.addBody(body);
  }

  update(delta) {
    this.world.step(1 / 60, delta, 3);
  }
}

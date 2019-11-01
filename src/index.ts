export let mouseAt: [number, number];
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
import { calculateBPM, playFile } from "./bpm";
import { eachFrame, random, randomf } from "./util";
import * as v2 from "./v2";
type V2 = [number, number];

let history = [] as V2[];
let actx: AudioContext;
let lastTime: number;
let interval: number;
let anal: { bpm: number; initial: number };

async function init() {
  canvas = document.getElementById("canvas") as HTMLCanvasElement;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ctx = canvas.getContext("2d");

  document.addEventListener("mousemove", e => {
    mouseAt = [e.clientX, e.clientY];
  });

  let file = "twisterium-angels-rock.mp3";

  console.log(file);

  anal = await calculateBPM(file);
  interval = (2 * 60) / anal.bpm;

  console.log(anal.bpm);
  document.getElementById("do-it").innerText = "Click when ready";

  document.addEventListener("mousedown", async e => {
    if (!actx) {
      document.getElementById("do-it").remove()
      actx = await playFile(file);
      lastTime = actx.currentTime + 0.02; // + anal.initial;
      eachFrame(mainLoop);
    }
    console.log(game);
  });
}

window.onload = init;

let rni = random(5);
let rnf = randomf(rni);

class Game{
  actors:Actor[] = [];  

  constructor(){
  }

  update(dTime:number)  {
    this.actors.push(new Tail([rnf()*window.screen.width, 0], [rnf()*100 - 50, 100]))
    
    this.actors = this.actors.filter(actor => actor.update(dTime))      
  }

  render(ctx:CanvasRenderingContext2D)  {
    redBlackLines();

    for(let actor of this.actors)
      actor.render(ctx)

  }

}

class Actor{
  constructor(public at:V2, public vel:V2){
  }

  update(dTime:number){
    this.at = v2.sum(this.at, this.vel)
    return true;
  }

  render(ctx:CanvasRenderingContext2D){
  }

}

class Tail extends Actor{
  segments:V2[] = [];
  color = "255,0,0"

  constructor(at:V2,vel:V2){
    super(at,vel)
    this.segments.push(this.at);
  }

  update(dTime:number){
    super.update(dTime);
    this.segments.push(this.at);
    if(this.segments.length>10)
      this.segments.shift()    
    return this.at[1] < 4000;
  }

  render(ctx:CanvasRenderingContext2D){
    for(let i=this.segments.length-1;i>0;i--){
      ctx.beginPath();
      ctx.lineWidth = 30;
      ctx.strokeStyle = `rgba(${this.color},${i*0.1})`
      ctx.moveTo(...this.segments[i-1])
      ctx.lineTo(...this.segments[i])
      ctx.stroke();
    }
  }
}

let game = new Game()

function mainLoop() {
  let dTime = actx.currentTime - lastTime;
  if (dTime >= interval) {
    game.update(interval);
    lastTime += interval;
    history.push(mouseAt);
    if (history.length > 60) history = history.splice(2);
    render();
  }
}

function render() {
  ctx.clearRect(0, 0, 2000, 2000);
  game.render(ctx);
}

function redBlackLines() {
  for (let i = 0; i < history.length - 1; i++) {
    ctx.lineWidth = 3 * (history.length - i);
    ctx.strokeStyle = `rgba(${["0,0,0", "255,0,0"][i % 2]},${20 /
      (20 + history.length - i)})`;
    ctx.beginPath();
    ctx.moveTo(...history[i]);
    ctx.lineTo(...history[i + 1]);
    ctx.stroke();
  }
}

function redBlackCircles() {
  for (let i = 0; i < history.length; i++) {
    let at = history[i];
    ctx.fillStyle = ["#000", "#f00"][i % 2];
    ctx.beginPath();
    ctx.arc(at[0], at[1], 10 * (history.length - i), 0, Math.PI * 2);
    ctx.fill();
  }
}


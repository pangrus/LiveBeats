// plugin_cam
function RGBCol(x){
  x=1.5-x*2;
  if(x<0) x=0;
  if(x>1) x=1;
  var r=1-x*2;
  if(r<0) r=0;
  var b=x*2-1;
  if(b<0) b=0;
  var g=x*4;
  if(g>2) g=4-g;
  g-=1;
  if(g<0) g=0;
  return [r,g,b];
}
function VowelOsc(actx){
	this.connect=function(out){
		this.vol.connect(out);
		this.delaylev.connect(out);
	};
	this.SetFreq=function(f){
		this.osc.frequency.value=f;
	};
	this.SetDetune=function(d){
		this.osc.detune.value=d;
	};
	this.GetNode=function(n){
		return this.osc;
	};
	this.SetFormant=function(f1,f2){
		this.fil1.frequency.value=f1*300*(f2+1)+300;
		this.fil2.frequency.value=500+2500*f2*(1-0.8*f1);
	};
	this.SetVibRate=function(v){
		this.lfo.frequency.value=v*9+1;
	};
	this.SetVibDepth=function(v){
		this.lfodepth.gain.value=v*100;
	};
	this.SetVol=function(v){
		this.vol.gain.value=v;
	};
	this.SetDelayLevel=function(v){
		this.delaylev.gain.value=v;
	}
	this.ProcessLimit=function(ev){
		var inbuf = ev.inputBuffer.getChannelData(0);
		var outbuf = ev.outputBuffer.getChannelData(0);
		var d=0;
		for(var i = 0; i < 1024; ++i){
			var r=Math.abs(inbuf[i]);
			if(r>this.limmax)
				this.limmax=r;
			else
				this.limmax*=.999;
			outbuf[i]=inbuf[i]/this.limmax;
		}
	};
	this.osc=actx.createOscillator();
	this.lfo=actx.createOscillator();
	this.lfodepth=actx.createGain();
	this.fil1=actx.createBiquadFilter();
	this.fil2=actx.createBiquadFilter();
	this.lim=actx.createScriptProcessor(1024,1,1);
	this.vol=actx.createGain();
	this.delay=actx.createDelay();
	this.delaylev=actx.createGain();
	this.lim.onaudioprocess=this.ProcessLimit;
	this.lim.limmax=0;
	this.delay.delayTime.value=0.2;
	this.delaylev.gain.value=0.5;
	this.lfo.frequency.value=5;
	this.lfodepth.gain.value=50;
	var wavImag=new Float32Array(300);
	var wavReal=new Float32Array(300);
	for(var i=0;i<300;++i){
		wavReal[i]=1;
		wavImag[i]=0;
	}
	this.osc.setPeriodicWave(actx.createPeriodicWave(wavReal,wavImag));
	this.osc.start();
	this.lfo.connect(this.lfodepth);
	this.lfodepth.connect(this.osc.detune);
	this.lfo.start();
	this.fil1.type="bandpass";
	this.fil2.type="bandpass";
	this.fil1.Q.value=15;
	this.fil2.Q.value=15;
	this.osc.connect(this.fil1);
	this.fil1.connect(this.fil2);
	this.fil2.connect(this.lim);
	this.lim.connect(this.vol);
	this.vol.connect(this.delaylev);
	this.delaylev.connect(this.delay);
	this.delay.connect(this.delaylev);
	this.SetFreq(55);
	this.SetFormant(0.5,0.5);
	this.SetVibRate(0.3);
	this.SetVibDepth(0.2);
	this.SetVol(0);
	this.SetDelayLevel(0.4);
}

plugin_cam = function(param){
//  console.log("plugin_cam")
	var vj_video_vs=`
		attribute vec3 position;
		void main(void){
			gl_Position = vec4(position, 1.0);
		}`;
	var vj_video_fsdiff=`
		precision mediump float;
		uniform vec2 resolution;
		uniform sampler2D textureCur;
		uniform sampler2D texturePre;
		uniform sampler2D textureDiff;
		void main(void){
			vec2 uv=gl_FragCoord.xy/resolution.xy;
			vec4 cur=texture2D(textureCur,uv);
			vec4 pre=texture2D(texturePre,uv);
			vec4 diff=texture2D(textureDiff,uv);
			vec4 d=abs(cur-pre);
			float v=max(d.x+d.y+d.z,diff.x*0.9);
			float sumx=0.0;
			float sumy=0.0;
			if(uv.y>0.99) {
				for(int i=0;i<20;++i) {
					float py=float(i)/20.0;
					vec2 p=vec2(uv.x,py);
					sumx+=texture2D(textureDiff,p).x;
				}
				sumx=sumx*0.05;
			}
			if(uv.x>0.99) {
				for(int i=0;i<20;++i) {
					float px=float(i)/20.0;
					vec2 p=vec2(px,uv.y);
					sumy+=texture2D(textureDiff,p).x;
				}
				sumy=sumy*0.05;
			}
			gl_FragColor=vec4(v,sumx,sumy,0);
		}`;
	var vj_video_fsscr=`
		precision mediump float;
		uniform float time;
		uniform vec2 resolution;
		uniform vec3 cursor;
		uniform vec3 cursorold;
		uniform sampler2D textureCur;
		uniform sampler2D textureDiff;
		uniform float rot;
		uniform float alpha;
		uniform float scale;
		uniform float poster;
		uniform float motion;
		uniform int kaleido;
		uniform float mosaic;
		uniform float wave;
		uniform float div;
		uniform float hue;
		uniform float sat;
		uniform float cont;
		uniform int pointer;
		uniform float melt;
		uniform float film;
		uniform float unsync;
		uniform float scan;
		float rand(vec2 p){
			return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
		}
		float smooth(float a, float b, float x){
			float f=(1.-cos(x*3.14159))*.5;
			return a+(b-a)*f;
		}
		float smoothrand(vec2 p){
			vec2 i = floor(p);
			vec2 f = fract(p);
			vec4 v = vec4(rand(i),rand(vec2(i.x+1., i.y)),rand(vec2(i.x,i.y+1.)),rand(vec2(i.x+1.,i.y+1.)));
			return smooth(smooth(v.x, v.y, f.x), smooth(v.z, v.w, f.x), f.y);
		}
		vec3 rgb2hsv(vec3 c){
			vec4 K = vec4(0., -1./3., 2./3., -1.0);
			vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
			vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
			float d = q.x - min(q.w, q.y);
			float e = 1.0e-10;
			return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
		}
		vec3 hsv2rgb(vec3 c){
			vec4 K = vec4(1., 2./3., 1./3., 3.);
			vec3 p = abs(fract(c.xxx + K.xyz) * 6. - K.www);
			return c.z * mix(K.xxx, clamp(p - K.xxx, 0., 1.), c.y);
		}
		vec2 trans(vec2 p){
			float t=atan(p.y, p.x)+time*0.0001;
			float r=length(p);
			return vec2(t,r);
		}
		vec2 sciogli(vec2 p){
			return p+(vec2(smoothrand(p*30.),smoothrand(p*31.))-vec2(.5))*melt;
		}
		void main() {
			vec2 uv=(gl_FragCoord.xy/resolution.xy-.5);
			float th=atan(uv.y,uv.x)+rot*3.14159/180.0;
			float r=length(uv)/scale;
			uv=vec2(cos(th)*r,sin(th)*r);
			uv+=.5;
			float cr=0.;
			if(pointer==1){
				float r=cursor.z*0.08+0.01;
				float dist=min(1.0,length(cursor.xy-uv));
				float th=atan((cursor.y-uv.y)/(cursor.x-uv.x));
				float fac=pow(1.02-(dist-r),20.0);
				cr=fac*pow(abs(sin(th*4.0+time/100.0)),2.0*dist/r);
			}
			if(pointer==2){
				float difx=abs(uv.x-cursor.x);
				float dify=abs(uv.y-cursor.y);
				float difxold=abs(uv.x-cursorold.x);
				float difyold=abs(uv.y-cursorold.y);
				cr=max(0.,1.0-abs(sin(sin(time*.00113)/(.1+difx))*difx-(uv.y-cursor.y)));
				cr=max(cr,1.0-abs(sin(sin(time*.00081)/(.1+difxold))*difxold-(uv.y-cursor.y)));
				cr=max(cr,1.0-abs(sin(sin(time*.00098)/(.1+difyold))*difyold-(uv.x-cursor.x)));
				cr=max(cr,1.0-abs(sin(sin(time*.000121)/(.1+difyold))*difyold-(uv.x-cursorold.x)));
				cr=pow(cr,136.);
			}
			if(pointer==3){
				float r=cursor.z*0.05;
				float fac=1.00002;
				float dist=1.;
				for(int i=0;i<8;++i){
					vec2 pos=cursor.xy;
					float fi=sin(float(i)*8.2);
					float fi2=cos(float(i)*3.3);
					float t=time*(0.005+fi*0.001)+fi;
					pos.x+=tan(fi)*sin(t)*0.11*(sin(fi))*cursor.z*2.;
					pos.y+=tan(fi2)*cos(t)*0.132*(sin(fi))*cursor.z*2.;
					dist=min(dist,1.);
					dist=min(dist,length(pos-uv));
				}
				fac-=(dist);
				cr=pow(fac,30.);
			}
			float mos=resolution.x/(mosaic*64.0+1.0);
			uv=vec2(1.0)-uv;
			if(kaleido>=1) {
				if(uv.x>0.5)
					uv.x=1.0-uv.x;
				if(kaleido>=2) {
					if(uv.y>0.5)
						uv.y=1.0-uv.y;
					if(kaleido>=3)
						if(uv.y>uv.x) {
							float t=uv.x;
							uv.x=uv.y;
							uv.y=t;
						}
				}
			}
			uv.x+=sin(uv.y*50.0+time*.005)*wave*0.05;
			uv=fract(uv*floor(1.5+div));
			vec2 uv2=uv=floor(uv*mos)/mos;
			float n1=max(0.,smoothrand(uv*12.+sin(floor(time*.024))*1231.21)-.95)*50.;
			float n2=pow(smoothrand(uv.xx*42.+floor(time*.01)*12.),20.);
			uv=uv+(vec2(smoothrand(uv*20.-time*.0011),smoothrand(uv*21.+time*.001))-vec2(.5))*melt*.1;
			uv.y=mod(uv.y+(time/6000.)*unsync,1.1);
			vec4 colCur,colDiff;
			if(uv.y>=1.0){
				colCur=colDiff=vec4(0.);
			}
			else{
				colCur=texture2D(textureCur,uv);
				colDiff=texture2D(textureDiff,uv);
			}
			float v=colDiff.x;
			colCur*=(sin(uv.y*525.)*scan+1.);
			vec3 hsv=rgb2hsv(colCur.xyz);
			hsv.z-=(n1+n2)*film;
			hsv.x+=hue;
			hsv.y*=sat;
			hsv.z=(hsv.z-.5)*(cont+1.)+.5;
			colCur=vec4(hsv2rgb(hsv),colCur.w);
			float poststep=max(2.,12.-poster*10.);
			if(poster<=0.01) poststep=256.;
			colCur=floor(colCur*poststep)/poststep;
			if(v>0.75) {
				colCur.x+=(1.0-colCur.x)*motion;
				colCur.y+=(1.0-colCur.y)*motion;
				colCur.z+=(1.0-colCur.z)*(v-0.75)*4.0*motion;
			}
			else if(v>0.5) {
				colCur.x+=(1.0-colCur.x)*motion;
				colCur.y+=(1.0-colCur.y)*(v-0.5)*4.0*motion;
			}
			else if(v>0.25) {
				colCur.x+=(1.0-colCur.x)*(v-0.25)*4.0*motion;
			}
			gl_FragColor=vec4(colCur.x+cr,colCur.y+cr,colCur.z+pow(cr,.5),1.0)*alpha;
		}`;
	this.createVideoTexture=function(video) {
		var tex=gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D,tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D,null);
		return tex;
	};
	this.updateTexture=function(video) {
		if(!video.srcObject){
			return;
		}
		var t=this.texturePre;
		this.texturePre=this.textureCur;
		this.textureCur=t;
		gl.bindTexture(gl.TEXTURE_2D,this.textureCur);
		gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.video);
		gl.bindTexture(gl.TEXTURE_2D,null);
	};
	this.createFramebuffer=function(w, h) {
		var frameBuff = gl.createFramebuffer();
		var tex = gl.createTexture();
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuff);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return {"f":frameBuff, "t":tex};
	}
	this.DrawFace=function(ctx,f,x,y,z,fPot){
		function Draw(){
	    ctx.beginPath();
	    var pm=220-fPot[2]*10;
	    ctx.moveTo(128,pm-fPot[0]*30*zz);
	    ctx.bezierCurveTo(128,pm-fPot[0]*30*zz,128+fPot[1]*64,pm-fPot[0]*50*zz,128+fPot[1]*64,pm);
	    ctx.bezierCurveTo(128+fPot[1]*64,pm+10*zz,128+30*fPot[0],pm+fPot[0]*30*zz,128,pm+fPot[0]*30*zz);
	    ctx.bezierCurveTo(128-30*fPot[0],pm+fPot[0]*30*zz,128-fPot[1]*64,pm+10*zz,128-fPot[1]*64,pm);
	    ctx.bezierCurveTo(128-fPot[1]*64,pm-fPot[0]*50*zz,128,pm-fPot[0]*30*zz,128,pm-fPot[0]*30*zz);
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.arc(128+40,120,22,0,2*Math.PI);
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.arc(128-40,120,22,0,2*Math.PI);
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.moveTo(128+20,75+fPot[0]*10);
	    ctx.bezierCurveTo(128+20,90-fPot[0]*20,128+70,90-fPot[0]*20,128+70,85);
	    ctx.moveTo(128-20,75+fPot[0]*10);
	    ctx.bezierCurveTo(128-20,90-fPot[0]*20,128-70,90-fPot[0]*20,128-70,85);
	    ctx.stroke();
	    ctx.beginPath();
	    var py=120+(y-128)*.1;
	    ctx.arc(128+40+(x-128-40)*.1,py,8,0,2*Math.PI);
			ctx.moveTo(128-40+(x-128+40)*.1,py);
	    ctx.arc(128-40+(x-128+40)*.1,py,8,0,2*Math.PI);
			ctx.stroke();
	    ctx.fill();
		}
		ctx.strokeStyle="#000";
		ctx.fillStyle="#000";
		ctx.lineWidth=8;
		ctx.lineJoin="round";
		ctx.lineCap="round";
		zz=z;
		zz=zz+(z-zz)*.5;
		ctx.clearRect(0,0,256,256);
		if(f){
			Draw();
			ctx.strokeStyle="#ff0";
			ctx.fillStyle="#ff0";
			ctx.lineWidth=4;
			Draw();
		}
/*    ctx.strokeStyle="#f22";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(x,y,16,0,Math.PI*2,true);
    ctx.stroke();
*/
	}
	this.audioctx=param.audioctx;
	this.wavedat=param.wavedat;
	this.freqdat=param.freqdat;
	this.dest=param.dest;
	this.senddest=param.senddest;

	param.w=512;
	param.h=512;

	this.w=param.w;
	this.h=param.h;

	this.video=param.video;
	this.elem=document.createElement("div");
	this.elem.width=this.w;
	this.elem.height=this.h;
	this.glcanvas=document.createElement("canvas");
	this.glcanvas.width=this.w;
	this.glcanvas.height=this.h;
	this.glcanvas.style.width="100%";
	this.glcanvas.style.height="100%";
	this.elem.appendChild(this.glcanvas);

  this.facectx=null;
/* for face animation
	this.facecanvas=document.createElement("canvas");
	this.facecanvas.width=256;
	this.facecanvas.height=256;
	this.facecanvas.style.width="100%";
	this.facecanvas.style.height="100%";
	this.facecanvas.style.position="absolute";
	this.facecanvas.style.top="0px";
	this.facecanvas.style.left="0px";
	this.elem.appendChild(this.facecanvas);
  this.facectx=this.facecanvas.getContext("2d");
*/
	this.sizex=param.w;
	this.sizey=param.h;


	var gl = this.glcanvas.getContext("webgl") || this.glcanvas.getContext("experimental-webgl");
	this.v_shader=gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(this.v_shader, vj_video_vs);
	gl.compileShader(this.v_shader);
	this.f_shaderdiff=gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(this.f_shaderdiff,vj_video_fsdiff);
	gl.compileShader(this.f_shaderdiff);
	this.f_shaderscr=gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(this.f_shaderscr,vj_video_fsscr);
	gl.compileShader(this.f_shaderscr);
	if(!gl.getShaderParameter(this.v_shader, gl.COMPILE_STATUS))
		alert(gl.getShaderInfoLog(this.v_shader));
	if(!gl.getShaderParameter(this.f_shaderdiff, gl.COMPILE_STATUS))
		alert(gl.getShaderInfoLog(this.f_shaderdiff));
	if(!gl.getShaderParameter(this.f_shaderscr, gl.COMPILE_STATUS))
		alert(gl.getShaderInfoLog(this.f_shaderscr));

	this.prgdiff = gl.createProgram();
	gl.attachShader(this.prgdiff, this.v_shader);
	gl.attachShader(this.prgdiff, this.f_shaderdiff);
	gl.linkProgram(this.prgdiff);
	this.prgscr = gl.createProgram();
	gl.attachShader(this.prgscr, this.v_shader);
	gl.attachShader(this.prgscr, this.f_shaderscr);
	gl.linkProgram(this.prgscr);

	this.framebuf=[];
	this.framebuf[0]=this.createFramebuffer(this.sizex,this.sizey);
	this.framebuf[1]=this.createFramebuffer(this.sizex,this.sizey);
	this.frameidx=0;
	var vPosition=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,vPosition);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]),gl.STATIC_DRAW);
	var vAttLocation = gl.getAttribLocation(this.prgdiff, "position");
	gl.enableVertexAttribArray(vAttLocation);
	gl.vertexAttribPointer(vAttLocation, 3, gl.FLOAT, false, 0, 0);
	var uniLocation = {};
	uniLocation.diff_resolution = gl.getUniformLocation(this.prgdiff,"resolution");
	uniLocation.diff_texturecur = gl.getUniformLocation(this.prgdiff,"textureCur");
	uniLocation.diff_texturepre = gl.getUniformLocation(this.prgdiff,"texturePre");
	uniLocation.diff_texturediff = gl.getUniformLocation(this.prgdiff,"textureDiff");
	uniLocation.scr_time = gl.getUniformLocation(this.prgscr,"time");
	uniLocation.scr_resolution = gl.getUniformLocation(this.prgscr,"resolution");
	uniLocation.scr_cursor = gl.getUniformLocation(this.prgscr,"cursor");
	uniLocation.scr_cursorold = gl.getUniformLocation(this.prgscr,"cursorold");
	uniLocation.scr_texturecur = gl.getUniformLocation(this.prgscr,"textureCur");
	uniLocation.scr_texturediff = gl.getUniformLocation(this.prgscr,"textureDiff");
  uniLocation.scr_rot = gl.getUniformLocation(this.prgscr,"rot");
  uniLocation.scr_alpha = gl.getUniformLocation(this.prgscr,"alpha");
  uniLocation.scr_scale = gl.getUniformLocation(this.prgscr,"scale");
	uniLocation.scr_poster = gl.getUniformLocation(this.prgscr,"poster");
	uniLocation.scr_motion = gl.getUniformLocation(this.prgscr,"motion");
	uniLocation.scr_kaleido = gl.getUniformLocation(this.prgscr,"kaleido");
	uniLocation.scr_pointer = gl.getUniformLocation(this.prgscr,"pointer");
	uniLocation.scr_mosaic = gl.getUniformLocation(this.prgscr,"mosaic");
	uniLocation.scr_wave = gl.getUniformLocation(this.prgscr,"wave");
	uniLocation.scr_div = gl.getUniformLocation(this.prgscr,"div");
	uniLocation.scr_hue = gl.getUniformLocation(this.prgscr,"hue");
	uniLocation.scr_sat = gl.getUniformLocation(this.prgscr,"sat");
	uniLocation.scr_cont = gl.getUniformLocation(this.prgscr,"cont");
	uniLocation.scr_film = gl.getUniformLocation(this.prgscr,"film");
	uniLocation.scr_melt = gl.getUniformLocation(this.prgscr,"melt");
	uniLocation.scr_unsync = gl.getUniformLocation(this.prgscr,"unsync");
	uniLocation.scr_scan = gl.getUniformLocation(this.prgscr,"scan");
	gl.activeTexture(gl.TEXTURE0);
	this.textureCur=this.createVideoTexture(this.video);
	this.texturePre=this.createVideoTexture(this.video);
	this.levx=new Uint8Array(this.sizex*4);
	this.levy=new Uint8Array(this.sizey*4);
	this.param = {
    "a":{"value":0,"type":"double","min":0,"max:":1},
    "rot":{"value":0,"type":"double","min":0,"max":1},
    "z":{"value":1, "type":"double","min":0,"max":10},
	"c":{"value":32,"type":"double","min":0,"max":100},
	"f":{"value":110,"type":"double","min":0,"max":1760},
	"v":{"value":0,"type":"double","min":0,"max":1},
	"q":{"value":5,"type":"double","min":0,"max":100},
	"porta":{"value":0.5,"type":"double","min":0,"max":1},
	"delay":{"value":0.4,"type":"double","min":0,"max":1},
	"scale":{"value":"cg+c+g","type":"string"},
	"kaleido":{"value":0, "type":"int", "min":0, "max":3},
	"pointer":{"value":0, "type":"int", "min":0, "max":3},
	"poster":{"value":0, "type":"double","min":0,"max":1},
	"motion":{"value":0, "type":"double","min":0,"max":1},
	"mosaic":{"value":0, "type":"double","min":0,"max":1},
	"face":{"value":0, "type":"int", "min":0,"max":1},
	"wave":{"value":0, "type":"double","min":0,"max":1},
	"div":{"value":0, "type":"int","min":0, "max":10},
	"hue":{"value":0, "type":"double","min":-4, "max":4},
	"sat":{"value":1, "type":"double","min":0, "max":1},
	"cont":{"value":0, "type":"double","min":0, "max":1},
	"melt":{"value":0, "type":"double","min":0, "max":1},
	"film":{"value":0, "type":"double","min":0, "max":1},
	"unsync":{"value":0, "type":"double","min":0, "max":1},
	"scan":{"value":0, "type":"double","min":0, "max":1},
	"px":{"value":0,"type":"double","min":0,"max":1},
	"py":{"value":0,"type":"double","min":0,"max":1},
	"pz":{"value":0,"type":"double","min":0,"max":1},
	};
	this.starttime=this.lasttime=0;
	this.px=this.pxold=0;
	this.py=this.pyold=0;
	this.pz=this.pzold=0;
	this.freq=110;
    this.scale=this.param.scale.value;
	this.Osc=new VowelOsc(this.audioctx);
	this.Osc.connect(this.dest);
	this.notes=Mml(this.param.scale.value);
	this.ready=0;
	this.cnt=0;
	this.anim=function(timestamp) {
//    if(this.starttime==0)
//			this.startime=timestamp;
//		if(timestamp-this.lasttime<60)
//			return;
//    this.lasttime=timestamp;
	  if(this.ready==0 || this.param.a.value==0)
			return;
		this.frameidx^=1;
		this.updateTexture(this.video);
    if(++this.ready<3)
      return;
    if(this.scale!=this.param.scale.value){
      this.scale=this.param.scale.value;
      this.notes=Mml(this.scale);
    }
		gl.useProgram(this.prgdiff);
		gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuf[this.frameidx].f);
		gl.uniform2fv(uniLocation.diff_resolution,[this.sizex,this.sizey]);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.textureCur);
		gl.uniform1i(uniLocation.diff_texturecur,0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.texturePre);
		gl.uniform1i(uniLocation.diff_texturepre,1);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, this.framebuf[this.frameidx^1].t);
		gl.uniform1i(uniLocation.diff_texturediff,2);
		gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

		gl.readPixels(0,this.sizey-1,this.sizex,1,gl.RGBA,gl.UNSIGNED_BYTE,this.levx);
		gl.readPixels(this.sizex-1,0,1,this.sizey,gl.RGBA,gl.UNSIGNED_BYTE,this.levy);
		var avex=0,avey=0;
		for(var i=0;i<this.sizex;++i)
			avex+=this.levx[i*4+1];
		for(var i=0;i<this.sizey;++i)
			avey+=this.levy[i*4+2];
		avex/=this.sizex;
		avey/=this.sizey;
		var	px=0,py=0,sumpx=0,sumpy=0;
		for(var i=0;i<this.sizex;++i) {
			var j=i*4+1;
			if(this.levx[j]>avex) {
				var d=this.levx[j]-avex;
				px+=i*d;
				sumpx+=d;
			}
		}
		for(var i=0;i<this.sizey;++i){
			var j=i*4+1;
			if(this.levy[j+1]>avey) {
				var d=this.levy[j+1]-avey;
				py+=i*d;
				sumpy+=d;
			}
		}
		if(sumpx)
			px/=sumpx;
		if(sumpy)
			py/=sumpy;
		this.param.px.value=this.px=this.px*0.8+(1-px/this.sizex)*0.2;
		this.param.py.value=this.py=this.py*0.8+(1-py/this.sizey)*0.2;
		this.pxold+=(this.px-this.pxold)*.1;
		this.pyold+=(this.py-this.pyold)*.1;
		var vol=Math.min(1,sumpx*0.0002);
		vol=vol*vol;
		if(vol>0)
			this.pz=this.pz*0.8+vol*0.2;
		gl.bindFramebuffer(gl.FRAMEBUFFER,null);
		gl.bindFramebuffer(gl.FRAMEBUFFER,null);
		gl.useProgram(this.prgscr);
		gl.uniform1f(uniLocation.scr_time,timestamp-this.starttime);
		gl.uniform2fv(uniLocation.scr_resolution,[this.w,this.h]);
		gl.uniform3fv(uniLocation.scr_cursor,[this.px,this.py,this.pz]);
		gl.uniform3fv(uniLocation.scr_cursorold,[this.pxold,this.pyold,this.pz]);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.textureCur);
		gl.uniform1i(uniLocation.scr_texturecur,0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.framebuf[this.frameidx].t);
		gl.uniform1i(uniLocation.scr_texturediff,1);
        gl.uniform1f(uniLocation.scr_rot,this.param.rot.value);
        gl.uniform1f(uniLocation.scr_alpha,this.param.a.value);
        gl.uniform1f(uniLocation.scr_scale,this.param.z.value);
		gl.uniform1f(uniLocation.scr_poster,this.param.poster.value);
		gl.uniform1f(uniLocation.scr_motion,this.param.motion.value);
		gl.uniform1i(uniLocation.scr_kaleido,this.param.kaleido.value);
		gl.uniform1i(uniLocation.scr_pointer,this.param.pointer.value);
		gl.uniform1f(uniLocation.scr_mosaic,this.param.mosaic.value);
		gl.uniform1f(uniLocation.scr_wave,this.param.wave.value);
		gl.uniform1f(uniLocation.scr_div,this.param.div.value);
		gl.uniform1f(uniLocation.scr_hue,this.param.hue.value);
		gl.uniform1f(uniLocation.scr_sat,this.param.sat.value);
		gl.uniform1f(uniLocation.scr_cont,this.param.cont.value);
		gl.uniform1f(uniLocation.scr_melt,this.param.melt.value);
		gl.uniform1f(uniLocation.scr_film,this.param.film.value);
		gl.uniform1f(uniLocation.scr_unsync,this.param.unsync.value);
		gl.uniform1f(uniLocation.scr_scan,this.param.scan.value);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0,4);
		gl.flush();
		var c=((this.notes[this.px*this.notes.length|0]-57)+(master.tunparam-5))*100;
		{
			this.Osc.SetFreq(this.param.f.value);
			this.Osc.GetNode().detune.setTargetAtTime(c,0,this.param.porta.value*.1);
			this.Osc.SetVol(this.pz*this.param.v.value);
			var f1,f2;
			var yy=this.py*2-.5;
			if(yy<0) yy=0;
			if(yy>1) yy=1;
			if(yy<0.25) f1=1-yy*4,f2=0;
			else if(yy<.5) f1=0,f2=(yy-.25)*4;
			else f1=(yy-.5)*2,f2=1;
			this.Osc.SetFormant(f1,f2);
			this.Osc.SetDelayLevel(this.param.delay.value);
			if(this.facectx)
				this.DrawFace(this.facectx, this.param.face.value,this.px*256, 256-this.py*256, this.pz*.5, [f1*2.5,f2/2,this.px*5]);
		}
	};
	this.ready=1;
};

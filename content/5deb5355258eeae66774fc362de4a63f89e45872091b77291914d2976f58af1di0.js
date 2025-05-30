/* esm.sh - esbuild bundle(base64-js@1.5.1) es2022 production */
/** 
 * @title base64-js
 * @author Jameson Little
 * @license MIT
 * @source https://github.com/beatgammit/base64-js
 * @copyright 2014
/*
The MIT License (MIT)

Copyright (c) 2014 Jameson Little

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
var B=Object.create;var l=Object.defineProperty;var _=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var w=Object.getPrototypeOf,j=Object.prototype.hasOwnProperty;var H=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports),U=(r,e)=>{for(var t in e)l(r,t,{get:e[t],enumerable:!0})},A=(r,e,t,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of k(e))!j.call(r,o)&&o!==t&&l(r,o,{get:()=>e[o],enumerable:!(a=_(e,o))||a.enumerable});return r},u=(r,e,t)=>(A(r,e,"default"),t&&A(t,e,"default")),C=(r,e,t)=>(t=r!=null?B(w(r)):{},A(e||!r||!r.__esModule?l(t,"default",{value:r,enumerable:!0}):t,r));var p=H(y=>{"use strict";y.byteLength=I;y.toByteArray=T;y.fromByteArray=D;var h=[],d=[],E=typeof Uint8Array<"u"?Uint8Array:Array,s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";for(F=0,L=s.length;F<L;++F)h[F]=s[F],d[s.charCodeAt(F)]=F;var F,L;d[45]=62;d[95]=63;function g(r){var e=r.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var t=r.indexOf("=");t===-1&&(t=e);var a=t===e?0:4-t%4;return[t,a]}function I(r){var e=g(r),t=e[0],a=e[1];return(t+a)*3/4-a}function O(r,e,t){return(e+t)*3/4-t}function T(r){var e,t=g(r),a=t[0],o=t[1],n=new E(O(r,a,o)),v=0,x=o>0?a-4:a,f;for(f=0;f<x;f+=4)e=d[r.charCodeAt(f)]<<18|d[r.charCodeAt(f+1)]<<12|d[r.charCodeAt(f+2)]<<6|d[r.charCodeAt(f+3)],n[v++]=e>>16&255,n[v++]=e>>8&255,n[v++]=e&255;return o===2&&(e=d[r.charCodeAt(f)]<<2|d[r.charCodeAt(f+1)]>>4,n[v++]=e&255),o===1&&(e=d[r.charCodeAt(f)]<<10|d[r.charCodeAt(f+1)]<<4|d[r.charCodeAt(f+2)]>>2,n[v++]=e>>8&255,n[v++]=e&255),n}function q(r){return h[r>>18&63]+h[r>>12&63]+h[r>>6&63]+h[r&63]}function z(r,e,t){for(var a,o=[],n=e;n<t;n+=3)a=(r[n]<<16&16711680)+(r[n+1]<<8&65280)+(r[n+2]&255),o.push(q(a));return o.join("")}function D(r){for(var e,t=r.length,a=t%3,o=[],n=16383,v=0,x=t-a;v<x;v+=n)o.push(z(r,v,v+n>x?x:v+n));return a===1?(e=r[t-1],o.push(h[e>>2]+h[e<<4&63]+"==")):a===2&&(e=(r[t-2]<<8)+r[t-1],o.push(h[e>>10]+h[e>>4&63]+h[e<<2&63]+"=")),o.join("")}});var c={};U(c,{byteLength:()=>G,default:()=>N,fromByteArray:()=>K,toByteArray:()=>J});var i=C(p());u(c,C(p()));var{byteLength:G,toByteArray:J,fromByteArray:K}=i,{default:m,...M}=i,N=m!==void 0?m:M;export{G as byteLength,N as default,K as fromByteArray,J as toByteArray};
//# sourceMappingURL=base64-js.mjs.map

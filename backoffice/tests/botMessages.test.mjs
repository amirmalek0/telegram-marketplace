import assert from 'node:assert/strict';
import { test } from 'node:test';
import { removeCustomMessage, referringMessages, move, previewText } from '../src/pages/bot-messages/helpers.ts';

const item=(key,rows=[])=>({key,name:key,text:'{user_name}',format:'plain',enabled:true,rows,contact_label:'',contact_style:''});
test('deleting a custom message removes only its linked buttons and empty rows',()=>{
 const messages=[item('start',[[{action:'message',value:'custom.help'},{action:'miniapp',value:'/'}],[{action:'message',value:'custom.help'}]]),item('custom.help')];
 assert.equal(referringMessages(messages,'custom.help').length,1);
 const next=removeCustomMessage(messages,'custom.help');
 assert.equal(next.length,1);assert.equal(next[0].rows.length,1);assert.equal(next[0].rows[0][0].value,'/');
 assert.equal(messages[0].rows.length,2);
 assert.equal(removeCustomMessage(messages,'start'),messages);
});
test('row ordering is immutable and bounded',()=>{
 const rows=['a','b','c'];
 assert.deepEqual(move(rows,0,2),['b','c','a']);
 assert.deepEqual(move(rows,0,-1),rows);
 assert.deepEqual(rows,['a','b','c']);
});
test('preview expands sample placeholders without injecting HTML',()=>{
 assert.equal(previewText({...item('start'),text:'سلام {first_name}'}),'سلام سارا');
 assert.equal(previewText({...item('start'),text:'{unknown}'}),'{unknown}');
});

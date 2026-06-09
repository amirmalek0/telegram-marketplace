
# Enterprise Blueprint

Modules:
- Users
- Products
- Orders
- Payments
- VIP
- Referrals
- Tickets
- Broadcasts
- Settings
- Analytics

Processes:
- API
- Telegram Bot
- Worker


Entities:

**User** 
id
first name
last name
username
telegram id
phone number
has active plan
active plan id
wallet_balance
plan expire date
referred by (user id)
is banned
created at

*Categories*
id
title
slug
icon
active
sort order

**Order**
id
user id
product id
amount
payment method
status
paid at
created at

**Payment**
id
order id
provider
gateway trx id
amount
status

**Plans**
id
title
price
duration
status

**Subscriptions**
id
user id
plan id
start date
end date

**Referrals**
id
referrer user id
referred user id
reward amount
created at

**Tickets**
id
user id
subject
status
priority
created at

**Tickets messages**
id
ticket id
sender type(user/admin)
sender id
message
created at

**Coupons**
id
code
discount type (static/percentage)
discount value
usage limit
expires at

**Wallet**
id
user id
balance
created at
updated at


**Wallet transactions**
id
user_id
type(purchase/pay/reward)
amount
balance before
balance after
created at

**BOT Settings**
key(TEXT)
value(jsonB)
updated at


{
"id": "cfg_main",
"settings": {
"shop_mode": "categories",
"show_views": true,
"enable_referrals": true,
"enable_vip": true,
"enable_support": true,
"payment_methods": [
"zarinpal",
"zibal",
"idpay",
"payping",
"crypto",
"ton",
"stars",
"manual_card"
]
}
}

**Broadcasts**
id
title
message
status
sent count
failed count
created at

**Product**
id
title
description
price
category id
delivery type -> {file,message,Inventory,bundle(a file + inventory code + message),external API call(like VPNS)}
file_id
message_id
Inventory_id
bundle_id
api_id
demo url
vip only
views count
status
created at
(how to handle subscription based? like access only for 30 days to this product. is it even needed?)


**File**
id
name
size
mime type
storage provider
bucket
object key

**message**
id
content

**Inventory**
id
items[]
**Inventory items**
id
value
status(available/sold)

**bundle**
id
config(file+message)

**api**
id
method
headers[]
body
response

**api_headers**
id
key
value




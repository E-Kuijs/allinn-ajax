# All-Inn Media Database Structure

## Doel

Een databaseontwerp waarmee meerdere apps veilig op een gedeeld platform kunnen draaien.

## Kernprincipe

Bijna alle data moet direct of indirect gekoppeld zijn aan een app.

## Basistabellen

### apps

- id
- slug
- name
- vertical
- brand_color
- logo_url
- status
- launch_date

### app_settings

- id
- app_id
- key
- value_json
- updated_at

### app_content

- id
- app_id
- content_key
- title
- body
- media_url
- locale

### profiles

- id
- user_id
- display_name
- avatar_url
- bio
- favorite_app_id

### memberships

- id
- user_id
- app_id
- tier
- status
- starts_at
- ends_at

### chat_rooms

- id
- app_id
- room_type
- title
- visibility

### chat_messages

- id
- app_id
- room_id
- sender_id
- body
- created_at

### listings

- id
- app_id
- seller_id
- title
- description
- price
- status

### listing_messages

- id
- app_id
- listing_id
- sender_id
- recipient_id
- body

### notifications

- id
- app_id
- user_id
- type
- title
- body
- payload_json

### events

- id
- app_id
- title
- starts_at
- location
- external_url

## Policies

### Altijd afdwingen

- gebruiker ziet alleen toegestane data binnen de juiste app-scope
- writes alleen waar gebruiker eigenaar of gemachtigd is
- admin-acties strikt beperken
- moderation-tabellen niet publiek schrijfbaar maken

## Veiligheidslagen

- block-lijsten per app
- profanity filtering per app of globaal
- chatlimieten per membership tier
- feature gating via server-side checks

## Conclusie

De database moet ontworpen worden als een gedeeld platform met strikte app-scheiding. Dat is de basis voor schaal naar meerdere communities.

# Remove use limits from the 10%, 20%, 30% and 40% coupons

## What changes
- KIND10-34TX, KIND20-OAK7, KIND30-SBXY and KIND40-U9RM can be used any number of times.
- They still never expire and stay hidden from the website.
- The 99% coupon (KIND99-7Q4M) keeps its 10-payment limit.
- No streaming changes.

## Technical details
- Data-only update: set `max_uses` to 2147483647 (effectively unlimited) on the four coupon rows by discount_percent in (10,20,30,40). The column is NOT NULL and `reserve_counselling_coupon` compares counts against it, so no schema or function change is needed.
- Verify by reading the rows back.

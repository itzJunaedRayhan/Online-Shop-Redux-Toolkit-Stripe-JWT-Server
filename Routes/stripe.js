const express = require("express");
const Stripe = require("stripe");
const path = require('path');
const { Order } = require("../models/order");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const stripe = Stripe(process.env.STRIPE_KEY);
const router = express.Router();


router.post('/create-checkout-session', async (req, res) => {
    const customer = await stripe.customers.create({
        metadata: {
            userId: req.body.userId,
            cart: JSON.stringify(req.body.cartItems),
        }
    })
    const line_items = req.body.cartItems.map((item) => {
        return {
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name,
                    images: [item.image],
                    description: item.desc,
                    metadata: {
                        id: item.id,
                    },
                },
                unit_amount: item.price * 100,
            },
            quantity: item.cartQuantity,
        };
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        shipping_address_collection: {
            allowed_countries: ['US', 'CA', 'BD'],
        },
        shipping_options: [
            {
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: {
                        amount: 0,
                        currency: 'usd',
                    },
                    display_name: 'Free shipping',
                    // Delivers between 5-7 business days
                    delivery_estimate: {
                        minimum: {
                            unit: 'business_day',
                            value: 5,
                        },
                        maximum: {
                            unit: 'business_day',
                            value: 7,
                        },
                    }
                }
            },
            {
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: {
                        amount: 1500,
                        currency: 'usd',
                    },
                    display_name: 'Next day air',
                    // Delivers in exactly 1 business day
                    delivery_estimate: {
                        minimum: {
                            unit: 'business_day',
                            value: 1,
                        },
                        maximum: {
                            unit: 'business_day',
                            value: 1,
                        },
                    }
                }
            },
        ],
        phone_number_collection: {
            enabled: true,
        },
        customer: customer.id,
        line_items,
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/checkout-success`,
        cancel_url: `${process.env.CLIENT_URL}/cart`,
    });

    res.send({ url: session.url });
});

//  STRIPE WEBHOOK
// This is your Stripe CLI webhook secret for testing your endpoint locally.

//  Create Order:
// Create order function

const createOrder = async (customer, data) => {
    const Items = JSON.parse(customer.metadata.cart);
    const newOrder = new Order({
      userId: customer.metadata.userId,
      customerId: data.customer,
      paymentIntentId: data.payment_intent,
      products: Items,
      subtotal: data.amount_subtotal,
      total: data.amount_total,
      shipping: data.customer_details,
      payment_status: data.payment_status,
    });
  
    try {
      const savedOrder = await newOrder.save();
      console.log("Processed Order:", savedOrder);
    } catch (err) {
      console.log(err);
    }
  };

router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    let endpointSecret;
    // endpointSecret = "whsec_e4f929f2a3eb368ad607b044b47b806623db5f4fb815379384939c6d38222ef2";
    const sig = req.headers['stripe-signature'];
    let data;
    let eventType;

    if (endpointSecret) {
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            console.log("Webhook Verified");
        } catch (err) {
            console.log(`Webhook Error: ${err.message}`);
            res.status(400).send(`Webhook Error: ${err.message}`);
            return;
        }

        data = event.data.object;
        eventType = event.type;
    } else {
        data = req.body.data.object;
        eventType = req.body.type;
    }

    // Handle the event
    if (eventType === "checkout.session.completed") {
        stripe.customers.retrieve(data.customer).then((customer) => {
            console.log(customer);
            console.log("data:", data);
            createOrder(customer, data);
        }).catch(err => console.log(err.message));
    }

    // Return a 200 res to acknowledge receipt of the event
    res.send().end();
});

// const webhookEndpoint = stripe.webhookEndpoints.create({
//     url: 'http://example.com/api/stripe/webhook',
//     enabled_events: [
//       'charge.failed',
//       'charge.succeeded',
//     ],
// });

module.exports = router;

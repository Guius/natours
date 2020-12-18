import axios from 'axios';
import { showAlert } from './alert';

const stripe = Stripe(
  'pk_test_51HydMQIEfZ5VJaFcoPRDIbksZQNfQTlXDPZ97p65qeyzjDWPUl1JTYQpbM3I2Ph9xHpIdjslIRnH6cWwT4ubZE2G00YLOVy6z8'
);

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

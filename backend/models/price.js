import mongoose from 'mongoose';

const priceSchema = new mongoose.Schema({
  token: { type: String, required: true },
  network: { type: String, required: true },
  timestamp: { type: Number, required: true },
  price: { type: Number, required: true },
}, { timestamps: true });

priceSchema.index({ token: 1, network: 1, timestamp: 1 }, { unique: true });

const Price = mongoose.model('Price', priceSchema);

export default Price;

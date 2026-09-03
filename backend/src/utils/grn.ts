import { Model } from 'mongoose';
import { IGRN } from '../models/GRN';
import { GRN_NUMBER_PAD_LENGTH, GRN_REFERENCE_PAD_LENGTH } from '../constants';

export async function generateGRNNumber(GRN: Model<IGRN>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;

  const last = await GRN.findOne({ grnNumber: { $regex: `^${prefix}` } })
    .sort({ grnNumber: -1 })
    .lean();

  const next = last ? parseInt((last.grnNumber as string).replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(GRN_NUMBER_PAD_LENGTH, '0')}`;
}

/**
 * The Reference / PO Number used to be free text, which let two GRNs end up
 * with the same "PO number" (or none at all). It is now assigned the same
 * way as grnNumber — sequential per year, so every GRN gets a unique one
 * without anyone having to type it.
 */
export async function generateGRNReferenceNumber(GRN: Model<IGRN>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const last = await GRN.findOne({ referenceNumber: { $regex: `^${prefix}` } })
    .sort({ referenceNumber: -1 })
    .lean();

  const next = last ? parseInt((last.referenceNumber as string).replace(prefix, ''), 10) + 1 : 1;
  return `${prefix}${String(next).padStart(GRN_REFERENCE_PAD_LENGTH, '0')}`;
}

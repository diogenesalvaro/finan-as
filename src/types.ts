import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  familyId: string;
  role: 'admin' | 'member';
  photoURL?: string;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
}

export interface Transaction {
  id: string;
  familyId: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description?: string;
  date: Timestamp;
  createdAt: Timestamp;
}

export interface Goal {
  id: string;
  familyId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Timestamp;
  isCompleted: boolean;
  createdAt: Timestamp;
}

export interface CreditCard {
  id: string;
  familyId: string;
  userId: string;
  cardName: string;
  cardNumberLast4: string;
  expiryDate?: string;
  limit?: number;
  currentBalance?: number;
  color: string;
  type: 'credit' | 'debit';
  createdAt: Timestamp;
  isShared?: boolean;
}

export const CATEGORIES = {
  income: ['Salário', 'Investimentos', 'Presente', 'Outros'],
  expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros']
};

export type MarketplaceItem = {
  id: string;
  title: string;
  price: number;
  category: string;
  seller: string;
  sellerId: string;
  location: string;
  description: string;
  time: string;
};

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: '1',
    title: 'Ajax Thuisshirt 2024/2025 - Maat L',
    price: 45,
    category: 'Shirts',
    seller: 'Edwin_K',
    sellerId: '00000000-0000-4000-8000-000000000001',
    location: 'Amsterdam',
    description: 'Origineel shirt, 2x gedragen. Zo goed als nieuw.',
    time: '2u geleden',
  },
  {
    id: '2',
    title: 'Ajax Sjaal Champions League 2019',
    price: 20,
    category: 'Sjaals',
    seller: 'AjaxFan88',
    sellerId: '00000000-0000-4000-8000-000000000002',
    location: 'Utrecht',
    description: 'Collector sjaal in topstaat.',
    time: '5u geleden',
  },
  {
    id: '3',
    title: '2x Ticket Ajax - Feyenoord',
    price: 120,
    category: 'Tickets',
    seller: 'TicketKing',
    sellerId: '00000000-0000-4000-8000-000000000003',
    location: 'Amsterdam',
    description: 'Twee tickets naast elkaar. Alleen overdracht via officiele route.',
    time: '1d geleden',
  },
  {
    id: '4',
    title: 'Gesigneerde foto Johan Cruijff',
    price: 75,
    category: 'Memorabilia',
    seller: 'VintageAjax',
    sellerId: '00000000-0000-4000-8000-000000000004',
    location: 'Haarlem',
    description: 'Gesigneerde foto met certificaat.',
    time: '2d geleden',
  },
];

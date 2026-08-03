'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addressSuggestions } from '@/lib/demo-data';
import { Icon } from '@/components/icons';

export function AddressFinder({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const matches = value.trim() ? addressSuggestions.filter((item) => item.toLowerCase().includes(value.toLowerCase())).slice(0, 4) : addressSuggestions;

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const address = value.trim() || addressSuggestions[0];
    router.push(`/search/?address=${encodeURIComponent(address)}`);
  };

  const choose = (address: string) => { setValue(address); setOpen(false); router.push(`/search/?address=${encodeURIComponent(address)}`); };

  return (
    <div className={`address-finder ${dark ? 'address-finder-dark' : ''}`} ref={ref}>
      <form onSubmit={submit} className="address-form">
        <Icon name="pin" size={19} />
        <input aria-label="Enter your home address" value={value} onChange={(event) => { setValue(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Enter your full address" />
        <button type="submit" aria-label="Find my officials"><Icon name="arrow-right" size={19} /></button>
      </form>
      {open ? <div className="address-suggestions" role="listbox">
        <div className="suggestion-heading"><span>Suggested addresses</span><small>Prototype address lookup</small></div>
        {matches.length ? matches.map((address) => <button type="button" role="option" onClick={() => choose(address)} key={address}><Icon name="pin" size={16} /><span>{address}</span></button>) : <p>No matching demonstration address. Search anyway.</p>}
      </div> : null}
    </div>
  );
}

import React, {useState, useEffect} from 'react';
import { Button, Dropdown, Form, DropdownProps, Segment, Message } from 'semantic-ui-react';
import { getPair } from '../apihelpers';

interface Props {
  api: {query: any, tx: any; };
  keyring: {getPairs: any, getPair: any ;};
  id: string;
  blockNumber: number;
  vote_ends: number;
  concluded: string;
}
interface Status{
  status: {
    isFinalized: boolean,
    asFinalized: string,
    type: string
  }
}
export default function ConcludeVote({ api, keyring, id, blockNumber, vote_ends, concluded } : Props) {
  const [message, setMessage] = useState({header: "", content:"", success:false, error:false, warning:false});
  // when all requirements are set true, clickable
  const requirements = {
    isExpired: false,
    isConcluded: false,
    isSelected: false
  };
  const [clickable, setClickable] = useState(requirements);

  const { isExpired, isConcluded, isSelected } = clickable;

  const initialState = {
    addressFrom: '',
    reference_id: id,
  };
  const [formState, setFormState] = useState(initialState);
  const { addressFrom, reference_id } = formState;

  const keyringOptions = keyring.getPairs().map((account: { address: any; meta: { name: string; }; }) => ({
      key: account.address,
      value: account.address,
      text: account.meta.name.toUpperCase()
  }));

  const onChange = (_: any, data:DropdownProps) => {
    setClickable(clickable => {
      return {
        ...clickable,
        isSelected: (data.state === 'addressFrom')? true:false
      }
    })

    setFormState(FormState => {
      return {
        ...FormState,
        [data.state]: data.value
      };
    });
  }

  const concludeVote = async () => {
    const fromPair = await getPair(api, keyring, addressFrom); 
    setMessage({...message, header: 'Just one second', content: 'Sending...', warning: true});

    api.tx.governanceModule
    .concludeVote(reference_id)
    .signAndSend(fromPair, ({status}: Status) => {
      if (status.isFinalized) {
        setMessage({...message, header: 'Transaction Completed!', content:`Completed at block hash #${status.asFinalized.toString()}`, success:true});
        } else {
        setMessage({...message, header: '', content: `Current transfer status: ${status.type}`, warning: true});
        }
      }).catch((e: any) => {
        setMessage({...message, header: 'Error', content: ':( transaction failed. Check the log.', error: true});
        console.error('ERROR:', e);
      });
  }

  useEffect(() => {
    let unsubscribe: () => any;
    if (vote_ends < blockNumber) {
      setClickable(clickable => {
        return {
          ...clickable,
          isExpired: (vote_ends > 0 && vote_ends < blockNumber)?true:false,
          isConcluded: (concluded === 'true')?true:false,
        };
      });
    }
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [blockNumber, isSelected, concluded, vote_ends])

  // TODO:refactor this
  const isDisabled = (isConcluded: boolean, isSelected:boolean, isExpired: boolean) => {
    if(!isConcluded && isSelected && isExpired) {
      return false;
    }
    return true;
  }

  return(
    <Segment>
      <h1>Conclude Vote</h1>
      <ul> Requirements
        <li>isConcluded: {isConcluded? 'True': 'False'}</li>
        <li>isExpired: {isExpired? 'True': 'False'}</li>
        <li>isSelected: {isSelected? 'True':'False'}</li>
      </ul>
      <Form>
        <Form.Field>
          <Dropdown
            placeholder='Select from your accounts'
            fluid
            label="From"
            onChange={onChange}
            search
            selection
            state='addressFrom'
            options={keyringOptions}
          />
        </Form.Field>
        <Form.Field>
          <Button
            onClick={concludeVote}
            disabled={isDisabled(isConcluded, isSelected, isExpired)}
            primary
            type='submit'>
            Conclude
          </Button>
        </Form.Field>
      </Form>
      {message.content && <Message
        success={message.success}
        error={message.error}
        warning={message.warning}
        header={message.header}
        content={message.content}
      />}
    </Segment>
  );
}

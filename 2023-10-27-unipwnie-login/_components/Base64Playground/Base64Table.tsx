import { fromBits, toBits } from "./utils";

const Base64Table = ({ value }: { value: string }) => {
  const bits = toBits(value);
  const paddedLength = Math.ceil(bits.length / 6) * 6;
  const encoded = fromBits(bits);

  return (
    <table className="text-center border not-prose text-sm">
      <tbody>
        <InputRow value={value} />
        <BitRow bits={bits} />
        <OutputRow value={encoded} />
      </tbody>
    </table>
  );
};
export default Base64Table;

const InputRow = ({ value }: { value: string }) => {
  return (
    <>
      <tr>
        <Cell isHeader rowSpan={2} scope="row">
          Source
        </Cell>
        <Cell isHeader scope="row">
          Text (ASCII)
        </Cell>
        {value.split("").map((c, i) => (
          <Cell key={i} colSpan={8}>
            {c}
          </Cell>
        ))}
        {[...new Array(3 - value.length)].map((_, i) => (
          <Cell key={i} colSpan={8} rowSpan={2} isPadding />
        ))}
      </tr>
      <tr>
        <Cell isHeader scope="row">
          Value
        </Cell>
        {value.split("").map((c, i) => (
          <Cell key={i} colSpan={8}>
            {c.charCodeAt(0)}
          </Cell>
        ))}
      </tr>
    </>
  );
};

const BitRow = ({ bits }: { bits: string }) => {
  const paddedLength = Math.ceil(bits.length / 6) * 6;
  return (
    <tr>
      <Cell isHeader colSpan={2} scope="row">
        Bits
      </Cell>
      {bits.split("").map((b, i) => (
        <Cell key={i} className="font-mono">
          {b}
        </Cell>
      ))}
      {[...new Array(paddedLength - bits.length)].map((_, i) => (
        <Cell className="font-mono" key={bits.length + i}>
          0
        </Cell>
      ))}
      {[...new Array(24 - paddedLength)].map((_, i) => (
        <Cell isPadding className="font-mono" key={paddedLength + i}>
          &nbsp;
        </Cell>
      ))}
    </tr>
  );
};

const OutputRow = ({ value }: { value: string }) => {
  const valueCodes = value.split("").map((v) => v.charCodeAt(0));
  return (
    <>
      <tr>
        <Cell isHeader rowSpan={2} scope="row">
          Base64
          <br />
          encoded
        </Cell>
        <Cell isHeader scope="row">
          Value
        </Cell>
        {valueCodes.map((v, i) => (
          <Cell key={i} colSpan={6}>
            {v}
          </Cell>
        ))}
        {[...new Array(4 - valueCodes.length)].map((_, i) => (
          <Cell isPadding key={valueCodes.length + i} colSpan={6}>
            Padding
          </Cell>
        ))}
      </tr>
      <tr>
        <Cell isHeader scope="row">
          Character
        </Cell>
        {value.split("").map((c, i) => (
          <Cell key={i} colSpan={6}>
            {c}
          </Cell>
        ))}
        {[...new Array(4 - value.length)].map((_, i) => (
          <Cell isPadding key={value.length + i} colSpan={6}>
            =
          </Cell>
        ))}
      </tr>
    </>
  );
};

const Cell = (
  props: JSX.IntrinsicElements["td"] & {
    isHeader?: boolean;
    isPadding?: boolean;
  },
) => {
  const { className = "", isHeader, isPadding, ...rest } = props;
  const fullClass = `${className} ${
    isPadding ? "bg-slate-400/10 italic text-center" : ""
  } ${isHeader ? "bg-slate-400/25 font-bold" : ""} ${
    !isPadding && !isHeader ? "bg-white dark:bg-black" : ""
  } border border-slate-400/50 dark:border-slate-600/50 py-[0.2em] px-[0.4em]`;
  return isHeader ? (
    <th {...rest} className={fullClass} />
  ) : (
    <td {...rest} className={fullClass} />
  );
};

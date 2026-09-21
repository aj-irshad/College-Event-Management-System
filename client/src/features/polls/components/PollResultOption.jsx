const PollResultOption = ({ result, totalVotes, highestVotes }) => {
  const percentage = totalVotes === 0 ? 0 : (result.votes / totalVotes) * 100;

  const isWinner = highestVotes > 0 && result.votes === highestVotes;

  return (
    <div className={`result-option ${isWinner ? "result-winner" : ""}`}>
      <div className="result-option-info">
        <span>{result.option}</span>

        <span>
          {result.votes} votes {" • "}
          {percentage.toFixed(1)}%
        </span>
      </div>

      <div className="result-progress">
        <div
          className="result-progress-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
};

export default PollResultOption;

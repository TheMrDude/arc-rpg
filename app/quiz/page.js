'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuizPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);

  const questions = [
    {
      question: "When facing a difficult challenge, you...",
      options: [
        { text: "Charge in head-first with confidence", archetype: "warrior", points: 3 },
        { text: "Plan and strategize before acting", archetype: "shadow", points: 3 },
        { text: "Research and learn everything about it first", archetype: "sage", points: 3 },
        { text: "Build tools and systems to solve it", archetype: "builder", points: 3 },
        { text: "Explore different approaches until something works", archetype: "seeker", points: 3 }
      ]
    },
    {
      question: "Your ideal way to spend a free day is...",
      options: [
        { text: "Competing in sports or physical activities", archetype: "warrior", points: 2 },
        { text: "Working on a creative project", archetype: "builder", points: 2 },
        { text: "Reading and expanding your knowledge", archetype: "sage", points: 2 },
        { text: "Planning and executing strategic games", archetype: "shadow", points: 2 },
        { text: "Exploring new places or trying new things", archetype: "seeker", points: 2 }
      ]
    },
    {
      question: "In a team setting, you naturally...",
      options: [
        { text: "Take charge and lead the group", archetype: "warrior", points: 2 },
        { text: "Create systems and organize tasks", archetype: "builder", points: 2 },
        { text: "Provide knowledge and analysis", archetype: "sage", points: 2 },
        { text: "Work behind the scenes strategically", archetype: "shadow", points: 2 },
        { text: "Discover new opportunities and connections", archetype: "seeker", points: 2 }
      ]
    },
    {
      question: "When you accomplish something, you feel best when...",
      options: [
        { text: "You overcame a difficult challenge through determination", archetype: "warrior", points: 3 },
        { text: "You created something tangible and useful", archetype: "builder", points: 3 },
        { text: "You mastered a complex skill or concept", archetype: "sage", points: 3 },
        { text: "You executed a plan perfectly", archetype: "shadow", points: 3 },
        { text: "You discovered something new and exciting", archetype: "seeker", points: 3 }
      ]
    },
    {
      question: "Your biggest strength is...",
      options: [
        { text: "Courage and persistence", archetype: "warrior", points: 3 },
        { text: "Creativity and problem-solving", archetype: "builder", points: 3 },
        { text: "Intelligence and insight", archetype: "sage", points: 3 },
        { text: "Strategy and precision", archetype: "shadow", points: 3 },
        { text: "Curiosity and adaptability", archetype: "seeker", points: 3 }
      ]
    },
    {
      question: "When starting a new project, you...",
      options: [
        { text: "Jump in and figure it out as you go", archetype: "warrior", points: 2 },
        { text: "Sketch out a plan and gather materials", archetype: "builder", points: 2 },
        { text: "Research best practices thoroughly first", archetype: "sage", points: 2 },
        { text: "Analyze risks and plan contingencies", archetype: "shadow", points: 2 },
        { text: "Experiment with different approaches", archetype: "seeker", points: 2 }
      ]
    },
    {
      question: "Your motto in life is closest to...",
      options: [
        { text: "Fortune favors the bold", archetype: "warrior", points: 3 },
        { text: "Build it and they will come", archetype: "builder", points: 3 },
        { text: "Knowledge is power", archetype: "sage", points: 3 },
        { text: "Work smarter, not harder", archetype: "shadow", points: 3 },
        { text: "The journey is the destination", archetype: "seeker", points: 3 }
      ]
    }
  ];

  const archetypeInfo = {
    warrior: {
      name: "Warrior",
      description: "You're bold, action-oriented, and face challenges head-on with courage and determination.",
      emoji: "⚔️",
      color: "from-red-600 to-orange-600"
    },
    builder: {
      name: "Builder",
      description: "You're constructive, creative, and turn ideas into reality through practical engineering and crafting.",
      emoji: "🔨",
      color: "from-amber-600 to-yellow-600"
    },
    sage: {
      name: "Sage",
      description: "You're wise, intellectual, and seek knowledge and understanding in everything you do.",
      emoji: "📚",
      color: "from-blue-600 to-indigo-600"
    },
    shadow: {
      name: "Shadow",
      description: "You're strategic, cunning, and approach challenges with precision and careful planning.",
      emoji: "🌙",
      color: "from-purple-600 to-pink-600"
    },
    seeker: {
      name: "Seeker",
      description: "You're curious, adventurous, and constantly exploring new horizons and discoveries.",
      emoji: "🧭",
      color: "from-green-600 to-teal-600"
    }
  };

  const handleAnswer = (option) => {
    const newAnswers = [...answers, option];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate result
      const scores = {};
      newAnswers.forEach(answer => {
        scores[answer.archetype] = (scores[answer.archetype] || 0) + answer.points;
      });

      const topArchetype = Object.keys(scores).reduce((a, b) =>
        scores[a] > scores[b] ? a : b
      );

      setResult(topArchetype);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
  };

  if (result) {
    const archetype = archetypeInfo[result];

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className={`inline-block bg-gradient-to-br ${archetype.color} rounded-full p-8 mb-6`}>
              <div className="text-8xl">{archetype.emoji}</div>
            </div>
            <h1 className="text-5xl font-bold mb-4">You're a {archetype.name}!</h1>
            <p className="text-2xl text-gray-300 mb-8">{archetype.description}</p>

            {/* Character Image */}
            <div className="mb-8">
              <img
                src={`/images/archetypes/${result}.png`}
                alt={archetype.name}
                className="w-64 h-64 object-cover rounded-2xl border-4 border-yellow-400 shadow-2xl mx-auto"
              />
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold mb-3">Transform Your To-Do List Into An Epic Quest</h3>
              <p className="text-gray-300 mb-4">
                Join ARC RPG and turn your daily tasks into heroic adventures matched to your {archetype.name} style!
              </p>
              <ul className="text-left space-y-2 mb-6 max-w-md mx-auto">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>AI transforms tasks into {archetype.name}-style quests</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Level up and unlock abilities</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Earn XP and gold for real accomplishments</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>100% free to start</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/signup')}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black rounded-lg font-bold text-lg"
              >
                Start Your Adventure
              </button>
              <button
                onClick={handleRestart}
                className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-lg"
              >
                Retake Quiz
              </button>
            </div>

            {/* Share Buttons */}
            <div className="mt-8 pt-8 border-t border-gray-700">
              <p className="text-gray-400 mb-4">Share your result!</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    const text = `I'm a ${archetype.name} in ARC RPG! Find out your archetype:`;
                    const url = window.location.origin + '/quiz';
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold"
                >
                  Share on Twitter
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + '/quiz');
                    alert('Link copied to clipboard!');
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Which Archetype Are You?</h1>
          <p className="text-gray-300">Discover your heroic personality type</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-orange-500 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>

        {/* Question */}
        <div className="bg-gray-800/50 rounded-xl p-8 mb-6">
          <h2 className="text-2xl font-bold mb-6 text-center">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className="w-full p-4 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-left transition-all hover:scale-102 border-2 border-transparent hover:border-yellow-400"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white underline"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
